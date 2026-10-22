// E2E Laporan BTOR: petugas buat BTOR dari checklist order tagging selesai
// (validasi kirim kosong → kandidat+badge foto → dana otomatis dari order) →
// status terkirim + stepper → admin verifikasi → terbit memo (nomor MEMO/YYYY)
// → pencairan dicairkan → negatif (order terpakai ditolak, memo pada BTOR
// terkirim ditolak) → hapus BTOR → order KEMBALI jadi kandidat (UNIQUE lepas).
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";

const rows = (sql) =>
  execSync(
    `mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`,
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForDb(fn, timeout = 20000, label = "DB") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const v = fn();
      if (v) return v;
    } catch {}
    await sleep(400);
  }
  throw new Error(`waitForDb timeout: ${label}`);
}

const HARI = new Date().toISOString().slice(0, 10);
const JUDUL1 = `E2E BTOR Tagging Rantau Kermas`;
const JUDUL2 = `E2E BTOR Kedua Rantau Kermas`;
const DESA_ID = 1; // rantaukermas
const PETUGAS_ID = 2683; // Petugas Taging (level 2, ditugaskan desa 1)

// ---- cleanup sisa run gagal (anak dulu demi UNIQUE idadopsi lepas) ----
const bersihkanBtorE2E = () => {
  const ids = rows(`SELECT id FROM btor WHERE judul LIKE 'E2E BTOR%'`).map((r) => r[0]);
  if (ids.length) {
    rows(
      `DELETE FROM btor_riwayat WHERE idbtor IN (${ids.join(",")});` +
        ` DELETE FROM btor_memo WHERE idbtor IN (${ids.join(",")});` +
        ` DELETE FROM btor_order WHERE idbtor IN (${ids.join(",")});` +
        ` DELETE FROM btor WHERE id IN (${ids.join(",")});`,
    );
  }
  rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'E2E-%'`);
  return ids.length;
};
const sisa = bersihkanBtorE2E();
if (sisa) console.log(`cleanup: ${sisa} BTOR E2E lama dihapus`);

// ---- fixture: order selesai (proses=3) desa rantaukermas yang belum dilaporkan ----
// Urut foto terbanyak dulu: 2 order utama wajib ber-foto (galeri detail), order
// ketiga bebas (kandidat kembali setelah hapus).
let kandidatDb = rows(
  `SELECT a.id, a.price, (SELECT COUNT(*) FROM foto_tagging f WHERE f.idadopsi=a.id) AS nf ` +
    `FROM data_adopsi a WHERE a.desa='rantaukermas' AND a.proses=3 ` +
    `AND a.id NOT IN (SELECT idadopsi FROM btor_order) ORDER BY nf DESC, a.id DESC LIMIT 6`,
).map((r) => ({ id: Number(r[0]), price: Number(r[1]) }));
const masukkanFixture = (n) => {
  const buat = [];
  for (let i = 0; i < n; i++) {
    const r = rows(
      `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,dur,memo,admin,proses,invoice,created_at,updated_at) ` +
        `VALUES ('E2EPH${Date.now() % 100000}${i}','rantaukermas',${PETUGAS_ID},'E2E Donatur',200000,'IDR','transfer',CURDATE(),1,'',1,3,` +
        `CONCAT('E2E-',UNIX_TIMESTAMP(),'-',${i}),NOW(),NOW()); SELECT LAST_INSERT_ID();`,
    );
    buat.push({ id: Number(r[r.length - 1][0]), price: 200000, fixture: true });
  }
  return buat;
};
if (kandidatDb.length < 3) {
  const baru = masukkanFixture(3 - kandidatDb.length);
  kandidatDb = [...baru, ...kandidatDb];
  console.log(`fixture: ${baru.length} order E2E dibuat`);
}
assert(kandidatDb.length >= 3, `fixture siap: ${kandidatDb.length} order kandidat`);
// 2 order utama (dengan foto dari petugas lain → uji badge), 1 untuk BTOR kedua
const [ORD_A, ORD_B, ORD_C] = kandidatDb;
assert(
  rows(`SELECT id FROM desa_petugas WHERE idpetugas=${PETUGAS_ID}`).length === 1 &&
    rows(`SELECT id FROM desa_petugas WHERE iddesa=${DESA_ID} AND idpetugas=${PETUGAS_ID}`).length === 1,
  "petugas 2683 ditugaskan di desa 1 SAJA (prasyarat desa otomatis)",
);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const sign = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("2h").sign(secret);
const tokPetugas = await sign({ userId: PETUGAS_ID, name: "Petugas Taging", role: "ADMIN", level: 2 });
const tokAdmin = await sign({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" });

// auto-klik tombol konfirmasi modal (pola laporan-check)
const pasangAutoConfirm = (ctx) =>
  ctx.addInitScript(() => {
    const pasang = () => {
      new MutationObserver(() => {
        document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
          if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    };
    document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
  });

const api = async (path, form) => {
  const res = await fetch(`${API}/${path}`, {
    method: form ? "POST" : "GET",
    body: form ? new URLSearchParams(form) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

const browser = await chromium.launch();

// ===================== SISI PETUGAS: BUAT & KIRIM BTOR =====================
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(ctxP);
ctxP.addCookies([{ name: "pa_session", value: tokPetugas, url: BASE }]);
const p = await ctxP.newPage();

// 1. Menu & halaman daftar
await p.goto(`${BASE}/admin/btor`, { waitUntil: "networkidle" });
const navP = await p.locator("aside nav a").allTextContents();
assert(navP.includes("Laporan BTOR"), `sidebar petugas memuat menu Laporan BTOR (${navP})`);
assert(await p.locator("h1", { hasText: "Laporan BTOR" }).count() >= 1, "halaman /admin/btor termuat");
assert((await p.locator('button:has-text("Setujui")').count()) === 0, "petugas: tanpa tombol setujui di daftar");

// 2. Form 7 langkah + validasi kirim kosong
await p.goto(`${BASE}/admin/btor/baru`, { waitUntil: "networkidle" });
assert((await p.locator("ol > li").count()) === 7, "form BTOR 7 langkah bernomor tampil");
assert((await p.locator('button:has-text("Verifikasi BTOR")').count()) === 0, "form petugas: tanpa tombol verifikasi");
await p.click('[data-testid="kirim-btor"]');
await p.waitForTimeout(400);
assert(
  (await p.locator("form p", { hasText: "Centang minimal satu order" }).count()) >= 1,
  "kirim BTOR kosong → pesan validasi",
);
assert(rows(`SELECT COUNT(*) FROM btor WHERE judul LIKE 'E2E BTOR%'`)[0][0] === "0", "tidak ada row tersimpan saat validasi gagal");

// 3. Desa otomatis dari penugasan → kandidat order langsung termuat
const desaAuto = p.locator('[data-testid="desa-otomatis"]');
assert(
  (await desaAuto.count()) === 1 && ((await desaAuto.inputValue()) ?? "").length > 0,
  "desa terisi otomatis dari penugasan petugas (tanpa pilih desa)",
);
assert(
  (await p.locator('select[aria-label="Pilih desa penugasan"]').count()) === 0,
  "pemilih desa tidak tampil untuk petugas yang hanya ditugaskan 1 desa",
);
await p.waitForSelector(`[data-testid="kandidat-${ORD_A.id}"]`, { timeout: 15000 });
const jmlK = await p.locator('[data-testid="jml-kandidat"]').textContent();
assert(/order selesai/.test(jmlK), `checklist kandidat termuat (${jmlK})`);
assert(
  (await p.locator(`[data-testid="kandidat-${ORD_A.id}"]`, { hasText: "belum ada foto Anda" }).count()) === 1,
  "kandidat tanpa foto petugas ditandai 'belum ada foto Anda'",
);

// 4. Centang 2 order + timeline 1 hari
await p.locator(`[data-testid="kandidat-${ORD_A.id}"] input[type="checkbox"]`).check();
await p.locator(`[data-testid="kandidat-${ORD_B.id}"] input[type="checkbox"]`).check();
assert(
  (await p.locator('[data-testid="jml-kandidat"]').textContent()).includes("2 dipilih"),
  "counter 2 order dipilih",
);
await p.click('[data-testid="tambah-hari"]');
await p.fill('[data-testid="entri-tanggal-0"]', HARI);
await p.fill('[data-testid="entri-teks-0"]', "Persiapan alat dan pemasangan banner tagging di lokasi.");

// 5. Dana otomatis dari total order (tanpa tombol) + identitas
assert(
  (await p.locator('input[name="dana"]').inputValue()) === (ORD_A.price + ORD_B.price).toLocaleString("id-ID"),
  `dana terisi otomatis dari total order terpilih (${ORD_A.price + ORD_B.price})`,
);
await p.fill('textarea[name="hasil"]', "Banner terpasang rapi; dokumentasi donatur lengkap.");
await p.fill('input[name="rekening_at"]', "Kelompok Taging E2E");
await p.fill('input[name="rekening_bank"]', "BRI");
await p.fill('input[name="rekening_norek"]', "0987654321");
await p.fill('input[name="judul"]', JUDUL1);

// 6. Kirim BTOR
await p.click('[data-testid="kirim-btor"]');
await p.waitForURL(/\/admin\/btor\/\d+\?created=1/, { timeout: 30000 });
const idBtor = Number(p.url().match(/\/admin\/btor\/(\d+)/)[1]);
assert(true, `BTOR terkirim → detail /admin/btor/${idBtor}`);

// 7. Detail: status terkirim + stepper tahap 1 selesai
assert((await p.locator('[data-testid="detail-status"]').textContent()).trim() === "Terkirim", "chip status Terkirim");
const stepDone = async (n) =>
  (await p.locator(`[data-testid="stepper-${n}"]`).getAttribute("class")).includes("text-emerald-800");
assert(await stepDone(1), "stepper 1 (Dikirim) selesai");
assert(!(await stepDone(2)), "stepper 2 (Diverifikasi) belum");

// tutup popup notifikasi (overlay z-60 mencegat klik di bawahnya)
await p.waitForFunction(() => document.body.style.overflow === "hidden");
await p.keyboard.press("Escape");
await p.waitForURL((u) => !u.searchParams.has("created"), { timeout: 10000 });

// 8. Tab Order & Pohon
await p.click('[data-testid="btor-tabs"] button:has-text("Order & Pohon")');
await p.waitForSelector('[data-testid="tab-panel-order"]');
const jmlOrder = await p.locator('[data-testid="detail-jml-order"]').textContent();
assert(jmlOrder.startsWith("2 order"), `tab order memuat 2 order (${jmlOrder})`);
assert((await p.locator(`[data-testid="order-${ORD_A.id}"]`).count()) === 1, `order ${ORD_A.id} tampil`);
assert((await p.locator(`[data-testid="order-${ORD_A.id}"] img`).count()) >= 1, "galeri foto tagging tampil di order");

// 8b. Thumbnail klikable → popup galeri (navigasi + tutup Escape)
await p.locator(`[data-testid="order-${ORD_A.id}"] [data-testid="order-foto"]`).first().click();
await p.waitForSelector('[data-testid="popup-foto-laporan"]');
const cAwal = (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim();
assert(cAwal.startsWith("1 / "), `popup galeri foto terbuka dari thumbnail (${cAwal})`);
const nFoto = Number(cAwal.split("/")[1]);
if (nFoto > 1) {
  await p.click('button[aria-label="Foto berikutnya"]');
  assert(
    (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === `2 / ${nFoto}`,
    "navigasi foto berikutnya di popup",
  );
}
await p.keyboard.press("Escape");
await p.waitForFunction(() => !document.querySelector('[data-testid="popup-foto-laporan"]'));
assert(true, "popup galeri tertutup via Escape");

// 9. DB: btor + snapshot desa + order + riwayat
const b1 = rows(`SELECT idpetugas,iddesa,desa_nama,status,dana FROM btor WHERE id=${idBtor}`)[0];
assert(b1[0] === String(PETUGAS_ID) && b1[1] === "1" && b1[2] === "rantaukermas", "btor terikat petugas×desa + snapshot desa_nama");
assert(b1[3] === "terkirim" && Number(b1[4]) === ORD_A.price + ORD_B.price, "status terkirim + dana = total order");
assert(
  rows(`SELECT idadopsi FROM btor_order WHERE idbtor=${idBtor} ORDER BY idadopsi`).map((r) => r[0]).join(",") ===
    [ORD_A.id, ORD_B.id].sort((a, b) => a - b).join(","),
  "btor_order memuat 2 order terpilih",
);
assert(rows(`SELECT aksi FROM btor_riwayat WHERE idbtor=${idBtor} AND aksi='dikirim'`).length === 1, "riwayat 'dikirim' tercatat");

// 10. Daftar petugas: BTOR miliknya tampil, tanpa aksi setujui
await p.goto(`${BASE}/admin/btor`, { waitUntil: "networkidle" });
assert((await p.locator(`a:has-text("${JUDUL1}")`).count()) >= 1, "BTOR tampil di daftar petugas");
assert((await p.locator('[data-testid="chip-status-terkirim"]').count()) >= 1, "chip status terkirim di daftar");
await p.goto(`${BASE}/admin/btor/${idBtor}`, { waitUntil: "networkidle" });
assert((await p.locator('button:has-text("Verifikasi BTOR")').count()) === 0, "petugas: tanpa tombol verifikasi di detail");

// ===================== NEGATIF API: order terpakai + kandidat exclude =====================
const kand = await api(`btororderkandidat?idpetugas=${PETUGAS_ID}&iddesa=${DESA_ID}`);
const kandIds = (kand.json ?? []).map((r) => r.idadopsi);
assert(!kandIds.includes(ORD_A.id) && !kandIds.includes(ORD_B.id), "kandidat tidak memuat order yang sudah dilaporkan");
assert(kandIds.includes(ORD_C.id), "order ketiga masih jadi kandidat");
const dup = await api("tambahbtor", {
  idpetugas: PETUGAS_ID, iddesa: DESA_ID, judul: JUDUL2, isi: "21 Oktober: Kegiatan.",
  dana: "1000", status: "draft", "idorder[]": ORD_A.id,
});
assert(dup.status === 400 && /sudah masuk BTOR lain/.test(dup.json?.pesan ?? ""), "tambahbtor dengan order terpakai ditolak 400");

// ===================== SISI ADMIN: VERIFIKASI → MEMO → PENCAIRAN =====================
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(ctxA);
ctxA.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
const a = await ctxA.newPage();

await a.goto(`${BASE}/admin/btor`, { waitUntil: "networkidle" });
assert((await a.locator(`a:has-text("${JUDUL1}")`).count()) >= 1, "admin melihat BTOR petugas di daftar");
assert((await a.locator('button:has-text("Setujui")').count()) >= 1, "admin punya tombol setujui cepat di daftar");

await a.click(`a:has-text("${JUDUL1}")`);
await a.waitForSelector(`[data-testid="btor-detail-${idBtor}"]`);
const stepDoneA = async (n) =>
  (await a.locator(`[data-testid="stepper-${n}"]`).getAttribute("class")).includes("text-emerald-800");
assert(!(await stepDoneA(2)), "admin: stepper 2 masih belum sebelum verifikasi");
await a.click('button:has-text("Verifikasi BTOR")');
await a.waitForURL(/\?diverifikasi=1/, { timeout: 30000 });
assert((await a.locator('[data-testid="detail-status"]').textContent()).trim() === "Disetujui", "chip status Disetujui");
assert(await stepDoneA(2), "stepper 2 (Diverifikasi) selesai");
assert(rows(`SELECT status FROM btor WHERE id=${idBtor}`)[0][0] === "disetujui", "DB status disetujui");
assert(rows(`SELECT aksi FROM btor_riwayat WHERE idbtor=${idBtor} AND aksi='verifikasi'`).length === 1, "riwayat 'verifikasi' tercatat");

await a.waitForFunction(() => document.body.style.overflow === "hidden");
await a.keyboard.press("Escape");
await a.waitForURL((u) => !u.searchParams.has("diverifikasi"), { timeout: 10000 });

// Memo: terbitkan dari form (default terisi dari BTOR)
await a.click('[data-testid="btor-tabs"] button:has-text("Memo")');
await a.waitForSelector('[data-testid="tab-panel-memo"]');
assert((await a.locator('[data-testid="memo-card"]').count()) === 0, "belum ada memo sebelum diterbitkan");
// scope ke form — tombol toggle header juga ber-teks "Terbitkan Memo"
const memoForm = a.locator('form:has(input[name="ttd_nama"])');
await memoForm.locator('button:has-text("Terbitkan Memo")').click();
await a.waitForURL(/\?memo=1/, { timeout: 30000 });
await a.waitForFunction(() => document.body.style.overflow === "hidden");
await a.keyboard.press("Escape");
await a.waitForURL((u) => !u.searchParams.has("memo"), { timeout: 10000 });
// reload mengembalikan tab aktif ke Ringkasan — buka tab Memo lagi
await a.click('[data-testid="btor-tabs"] button:has-text("Memo")');
await a.waitForSelector('[data-testid="memo-card"]');
const nomorMemo = rows(`SELECT nomor FROM btor_memo WHERE idbtor=${idBtor}`)[0][0];
assert(new RegExp(`^MEMO/${HARI.slice(0, 4)}/\\d{4}$`).test(nomorMemo), `nomor memo otomatis ${nomorMemo}`);
assert(
  (await a.locator('[data-testid="memo-card"]', { hasText: nomorMemo }).count()) === 1,
  "memo-card menampilkan nomor memo",
);
assert(
  (await a.locator('[data-testid="memo-jumlah"]').textContent()).includes((ORD_A.price + ORD_B.price).toLocaleString("id-ID")),
  "memo-jumlah = dana BTOR",
);
assert((await a.locator('[data-testid="memo-status"]').textContent()).trim() === "Menunggu pencairan", "memo status awal menunggu");
assert(await stepDoneA(3), "stepper 3 (Memo) selesai");
assert(rows(`SELECT aksi FROM btor_riwayat WHERE idbtor=${idBtor} AND aksi='memo'`).length === 1, "riwayat 'memo' tercatat");

// Pencairan: dicairkan
await a.selectOption('select[name="status_pencairan"]', "dicairkan");
await a.fill('input[name="catatan_pencairan"]', `Ditransfer ${HARI}`);
await a.click('button:has-text("Perbarui")');
await a.waitForURL(/\?pencairan=1/, { timeout: 30000 });
await a.waitForFunction(() => document.body.style.overflow === "hidden");
await a.keyboard.press("Escape");
await a.waitForURL((u) => !u.searchParams.has("pencairan"), { timeout: 10000 });
await a.click('[data-testid="btor-tabs"] button:has-text("Memo")');
await a.waitForSelector('[data-testid="memo-card"]');
assert((await a.locator('[data-testid="memo-status"]').textContent()).trim() === "Dana dicairkan", "chip memo → Dana dicairkan");
assert(await stepDoneA(4), "stepper 4 (Pencairan) selesai");
assert(
  rows(`SELECT status_pencairan FROM btor_memo WHERE idbtor=${idBtor}`)[0][0] === "dicairkan",
  "DB status_pencairan dicairkan",
);
assert(rows(`SELECT aksi FROM btor_riwayat WHERE idbtor=${idBtor} AND aksi='pencairan'`).length === 1, "riwayat 'pencairan' tercatat");

// ===================== BTOR KEDUA (API) → badge admin → hapus → UNIQUE lepas =====================
const mk2 = await api("tambahbtor", {
  idpetugas: PETUGAS_ID, iddesa: DESA_ID, judul: JUDUL2, isi: "21 Oktober: Kegiatan penutup.",
  dana: String(ORD_C.price), status: "terkirim", "idorder[]": ORD_C.id, oleh: "2682",
});
assert(mk2.status === 200 && mk2.json?.id, "BTOR kedua dibuat via API (terkirim)");
const idBtor2 = mk2.json.id;

const memoTolak = await api("tambahmemobtor", {
  idbtor: idBtor2, tanggal: HARI, dari: "Kelompok Taging E2E", kepada: "Pohon Asuh",
  proyek: JUDUL2, isi: "Isi memo.", jumlah: "1000", penerima: "Kelompok Taging E2E",
});
assert(memoTolak.status === 400 && /diverifikasi dulu/.test(memoTolak.json?.pesan ?? ""), "memo pada BTOR terkirim ditolak 400");
const revTolak = await api("revisibtor", { id: idBtor, catatan: "jangan", oleh: "2682" });
assert(revTolak.status === 400, "revisi pada BTOR disetujui ditolak 400");

await a.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
assert(
  (await a.locator('[data-testid="widget-btor"]', { hasText: "1 BTOR menunggu verifikasi" }).count()) === 1,
  "widget dashboard: 1 BTOR menunggu verifikasi",
);
assert((await a.locator('[data-testid="nav-badge-btor"]').first().textContent()).trim() === "1", "badge sidebar BTOR = 1");

const hapus = await api("hapusbtor", { id: idBtor2 });
assert(hapus.status === 200, "hapusbtor OK");
assert(rows(`SELECT COUNT(*) FROM btor WHERE id=${idBtor2}`)[0][0] === "0", "BTOR kedua terhapus");
assert(rows(`SELECT COUNT(*) FROM btor_order WHERE idadopsi=${ORD_C.id}`)[0][0] === "0", "btor_order bersih");
const kand2 = await api(`btororderkandidat?idpetugas=${PETUGAS_ID}&iddesa=${DESA_ID}`);
assert(
  (kand2.json ?? []).some((r) => r.idadopsi === ORD_C.id),
  `order ${ORD_C.id} KEMBALI jadi kandidat setelah hapus (UNIQUE lepas)`,
);

// ===================== CLEANUP =====================
bersihkanBtorE2E();
assert(rows(`SELECT COUNT(*) FROM btor WHERE judul LIKE 'E2E BTOR%'`)[0][0] === "0", "cleanup: semua BTOR E2E terhapus");

await browser.close();
console.log("\nSEMUA CEK BTOR LULUS ✓");
