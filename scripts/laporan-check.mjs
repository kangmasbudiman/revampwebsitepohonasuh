// E2E Laporan Kegiatan (form step-by-step ala contoh): buat DRAF + foto
// bertahap → kirim (validasi dana/hasil) → chip status → filter jenis/status →
// responsif (desktop tabel / mobile kartu) → ownership + visibilitas draf
// (petugas lihat draf sendiri, admin melihat semua) → admin menyetujui
// (tombol cepat di daftar + tombol approve di form admin) → hapus foto/laporan.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
const LARAVEL = "/opt/homebrew/var/www/restApiPohonasuh";

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

fs.writeFileSync(
  "/tmp/laporan-e2e.png",
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

// cleanup sisa run gagal SEBELUM hitung apa pun — file fisik hanya milik
// fixture (nama dari DB; glob bebas pernah menghapus foto produksi di VPS)
const fileLama = rows(
  `SELECT lf.url FROM laporan_foto lf JOIN laporan_kegiatan lk ON lk.id=lf.idlaporan WHERE lk.judul LIKE 'E2E Lap%'`,
).map((r) => String(r[0] ?? "").split("/").pop()).filter(Boolean);
rows(`
  DELETE lf FROM laporan_foto lf
  JOIN laporan_kegiatan lk ON lk.id = lf.idlaporan
  WHERE lk.judul LIKE 'E2E Lap%';
  DELETE FROM laporan_kegiatan WHERE judul LIKE 'E2E Lap%';
`);
fileLama.forEach((n) => execSync(`rm -f ${LARAVEL}/public/upload/laporan/${n}`));

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const sign = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("2h").sign(secret);
const tokPetugas = await sign({ userId: 2683, name: "Petugas Taging", role: "ADMIN", level: 2 });
const tokAdmin = await sign({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" });

// auto-klik tombol konfirmasi modal (pola admin-check)
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

const browser = await chromium.launch();

// ===================== SISI PETUGAS =====================
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(ctxP);
ctxP.addCookies([{ name: "pa_session", value: tokPetugas, url: BASE }]);
const p = await ctxP.newPage();

// 1. Menu & halaman daftar
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
const navP = await p.locator("aside nav a").allTextContents();
assert(
  navP.length === 4 && navP.includes("Laporan Kegiatan"),
  `sidebar petugas 4 menu termuat (${navP})`,
);
assert(await p.locator("h1", { hasText: "Laporan Kegiatan" }).count() >= 1, "halaman /admin/laporan termuat");
assert((await p.locator('select[aria-label="Filter status"]').count()) === 1, "petugas punya filter status");

// 2. Validasi kirim kosong ditolak client-side
await p.goto(`${BASE}/admin/laporan/baru`, { waitUntil: "networkidle" });
assert((await p.locator("ol > li").count()) === 10, "form 10 langkah bernomor tampil (default jenis tagging)");
assert((await p.locator('button:has-text("Setujui")').count()) === 0, "form petugas: tanpa tombol setujui");
await p.click('button:has-text("Kirim Laporan")');
await p.waitForTimeout(400);
assert(
  (await p.locator("form p", { hasText: "Lengkapi nama kegiatan" }).count()) >= 1,
  "kirim form kosong → pesan validasi",
);
assert(rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE judul LIKE 'E2E Lap%'`)[0][0] === "0", "tidak ada row tersimpan saat validasi gagal");

// 3. Buat DRAF + foto bertahap
await p.fill('form input[name="judul"]', "E2E Laporan Kegiatan");
await p.selectOption('form select[name="jenis"]', "pemantauan");
await p.fill('form input[name="tanggal"]', HARI);
await p.click('[data-testid="tambah-hari"]');
await p.fill('[data-testid="entri-teks-0"]', "Uraian kegiatan uji end-to-end.");
assert(
  (await p.locator('[data-testid="isi-counter"]').textContent()).includes("/500"),
  "counter isi N/500 tampil di editor timeline",
);
assert((await p.locator("form p", { hasText: /\/500/ }).count()) >= 1, "counter N/500 tampil di form");
await p.setInputFiles('form input[type=file][accept^="image"]', "/tmp/laporan-e2e.png");
assert((await p.locator('button[aria-label^="Buang foto baru"]').count()) === 1, "thumbnail foto baru muncul di dropzone");
await p.click('button:has-text("Simpan sebagai Draft")');
await p.waitForURL(/\/admin\/laporan\/\d+\/edit\?created=1/, { timeout: 30000 });
const ID = Number(p.url().match(/\/admin\/laporan\/(\d+)\/edit/)[1]);
assert(!!ID, `draf dibuat id=${ID}`);
await waitForDb(
  () => rows(`SELECT status FROM laporan_kegiatan WHERE id=${ID}`)[0]?.[0] === "draft",
  20000, "status=draft di DB",
);
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`)[0][0] === "1",
  20000, "foto terunggah saat simpan draf",
);
assert(
  (await p.locator("text=Draf — laporan belum dikirim").count()) >= 1,
  "chip Draf tampil di halaman edit",
);

// 4. Lengkapi lalu KIRIM (dana + hasil wajib)
await p.fill('form input[name="dana"]', "1500000");
assert(
  /1\.500\.000/.test(await p.inputValue('form input[name="dana"]')),
  "input dana memformat ribuan id-ID",
);
await p.fill('form input[name="tanggal_selesai"]', HARI);
await p.fill('form textarea[name="hasil"]', "Hasil kegiatan terukur.");
// clik kirim tanpa foto sekarang tidak masalah — foto sudah ada 1
await p.click('button:has-text("Kirim Laporan")');
await p.waitForURL(/dikirim=1/, { timeout: 30000 });
await waitForDb(
  () => {
    const r = rows(`SELECT status,dana,hasil,tanggal_selesai FROM laporan_kegiatan WHERE id=${ID}`)[0];
    return r && r[0] === "terkirim" && Number(r[1]) === 1500000 && r[2] === "Hasil kegiatan terukur." && r[3] === HARI;
  },
  20000, "status terkirim + dana + hasil + tanggal_selesai",
);
assert(true, "kirim: status=terkirim dana=1.500.000 hasil+range tersimpan");
assert(
  (await p.locator("text=Laporan terkirim dan akan diperiksa").count()) >= 1,
  "banner dikirim tampil",
);

// 5. Hapus foto via × lalu unggah ulang via Simpan Perubahan
const fotoId = rows(`SELECT id FROM laporan_foto WHERE idlaporan=${ID}`)[0][0];
await p.click(`button[aria-label="Hapus foto laporan ${fotoId}"]`);
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`)[0][0] === "0",
  20000, "foto terhapus via ×",
);
assert(true, "foto terhapus via tombol ×");
await p.setInputFiles('form input[type=file][accept^="image"]', "/tmp/laporan-e2e.png");
await p.click('button:has-text("Simpan Perubahan")');
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`)[0][0] === "1",
  20000, "foto terunggah ulang",
);
assert(true, "unggah ulang foto via Simpan Perubahan");

// 6. Daftar + filter (desktop = tabel) — chip status & dana
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(await p.locator("table").first().isVisible(), "desktop: tabel tampil");
assert((await p.locator("a", { hasText: "E2E Laporan Kegiatan" }).count()) >= 1, "baris laporan tampil");
assert(
  (await p.locator("table span", { hasText: "Terkirim" }).count()) >= 1,
  "chip Terkirim di tabel",
);
assert(
  /1\.500\.000/.test(await p.locator("table").first().innerText()),
  "kolom dana menampilkan Rp 1.500.000",
);
await p.selectOption('select[aria-label="Filter jenis kegiatan"]', "pemantauan");
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("1"), "filter jenis pemantauan → 1");
await p.selectOption('select[aria-label="Filter jenis kegiatan"]', "tagging");
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("0"), "filter jenis tagging → 0");
await p.selectOption('select[aria-label="Filter jenis kegiatan"]', "");
await p.selectOption('select[aria-label="Filter status"]', "draft");
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("0"), "filter status draft → 0 (milik kita terkirim)");
await p.click('button[aria-label="Reset filter"]');
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("1"), "reset filter mengembalikan daftar");

// 6b. Popup galeri semua foto (desktop): navigasi panah/tombol + strip + Escape
for (let i = 0; i < 2; i++) {
  execSync(
    `curl -s -X POST ${API}/uploadlaporanfoto -F "idlaporan=${ID}" -F "foto=@/tmp/laporan-e2e.png;type=image/png" > /dev/null`,
  );
}
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
await p.click('button[aria-label="Lihat 3 foto E2E Laporan Kegiatan"]');
await p.waitForSelector('[data-testid="popup-foto-laporan"]');
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "1 / 3",
  "popup galeri terbuka — counter 1 / 3",
);
assert(await p.locator('[data-foto-utama] img').isVisible(), "foto utama tampil di popup");
assert(
  (await p.locator('[data-testid="popup-foto-laporan"] button[aria-label^="Lihat foto"]').count()) === 3,
  "strip popup memuat semua 3 foto",
);
assert(
  (await p.evaluate(() => document.body.style.overflow)) === "hidden",
  "scroll body terkunci saat popup terbuka",
);
assert(await p.locator('button[aria-label="Foto sebelumnya"]').isDisabled(), "tombol sebelumnya disabled di foto pertama");
await p.click('button[aria-label="Foto berikutnya"]');
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "2 / 3",
  "klik berikutnya → 2 / 3",
);
await p.keyboard.press("ArrowRight");
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "3 / 3",
  "panah kanan → 3 / 3",
);
assert(await p.locator('button[aria-label="Foto berikutnya"]').isDisabled(), "tombol berikutnya disabled di foto terakhir");
await p.click('[data-testid="popup-foto-laporan"] button[aria-label="Lihat foto 1"]');
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "1 / 3",
  "klik thumbnail strip → kembali 1 / 3",
);
await p.keyboard.press("Escape");
await p.waitForSelector('[data-testid="popup-foto-laporan"]', { state: "detached" });
assert(
  (await p.evaluate(() => document.body.style.overflow)) === "",
  "scroll body dibuka kembali setelah popup tertutup",
);
assert(true, "Escape menutup popup galeri");

// 7. Mobile = kartu, tabel tersembunyi
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
// count() menghitung node DOM — tabel desktop (hidden md:block) tetap ada di
// DOM saat mobile, maka uji visibilitasnya, bukan keberadaannya.
assert(!(await p.locator("table").first().isVisible()), "mobile 390px: tabel tersembunyi");
assert(
  // wrapper tabel desktop juga rounded-2xl — kartu mobile dibedakan kelas p-4
  await p.locator("div.rounded-2xl.p-4", { hasText: "E2E Laporan Kegiatan" }).first().isVisible(),
  "mobile 390px: kartu laporan tampil",
);

// 7b. Popup galeri via strip foto kartu mobile
await p.click('button[aria-label="Lihat foto 1 E2E Laporan Kegiatan"]');
await p.waitForSelector('[data-testid="popup-foto-laporan"]');
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "1 / 3",
  "mobile: popup galeri terbuka dari strip kartu (1 / 3)",
);
await p.click('button[aria-label="Tutup galeri foto"]');
await p.waitForSelector('[data-testid="popup-foto-laporan"]', { state: "detached" });
assert(true, "mobile: tombol X menutup popup galeri");
await p.setViewportSize({ width: 1280, height: 800 });

// 8. Visibilitas draf: draf petugas terlihat petugas, TIDAK oleh admin
const rDraft = execSync(
  `curl -s -X POST ${API}/tambahlaporan -d "idpetugas=2683&judul=E2E Laporan Draf&jenis=tagging&tanggal=${HARI}&isi=masih draf&status=draft"`,
).toString();
const idDraft = Number(rDraft.match(/"id":(\d+)/)?.[1] ?? 0);
assert(!!idDraft, `fixture draf id=${idDraft}`);
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await p.locator("main", { hasText: "E2E Laporan Draf" }).count()) >= 1,
  "petugas melihat drafnya sendiri (chip Draft)",
);

// 9. Ownership: laporan milik admin tak terlihat/dibuka petugas
let idAdm = rows(`SELECT id FROM laporan_kegiatan WHERE judul='E2E Laporan Admin'`)[0]?.[0];
if (!idAdm) {
  const r = execSync(
    `curl -s -X POST ${API}/tambahlaporan -d "idpetugas=2682&judul=E2E Laporan Admin&jenis=tagging&tanggal=${HARI}&isi=laporan milik admin"`,
  ).toString();
  idAdm = Number(r.match(/"id":(\d+)/)?.[1] ?? 0);
}
assert(!!idAdm, `fixture laporan admin id=${idAdm}`);
assert(
  (await p.locator("main", { hasText: "E2E Laporan Admin" }).count()) === 0,
  "petugas TIDAK melihat laporan milik admin",
);
await p.goto(`${BASE}/admin/laporan/${idAdm}/edit`, { waitUntil: "networkidle" });
assert(
  /404|could not be found/i.test(await p.textContent("body")),
  "petugas buka edit laporan admin → 404",
);

// 10. ===================== SISI ADMIN =====================
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(ctxA);
ctxA.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
const a = await ctxA.newPage();
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await a.locator("main", { hasText: "E2E Laporan Kegiatan" }).count()) >= 1,
  "admin melihat laporan terkirim petugas",
);
assert(
  (await a.locator("main", { hasText: "E2E Laporan Draf" }).count()) >= 1,
  "admin melihat draf petugas",
);
assert(
  (await a.locator("main", { hasText: "E2E Laporan Admin" }).count()) >= 1,
  "admin melihat laporan miliknya (terkirim)",
);
assert((await a.locator('select[aria-label="Filter petugas"]').count()) === 1, "admin punya filter petugas");
assert((await a.locator('select[aria-label="Filter status"]').count()) === 1, "admin punya filter status");
assert(
  (await a.locator(`table form:has(input[name="id"][value="${idDraft}"]) button:has-text("Setujui")`).count()) === 1,
  "admin: tombol Setujui muncul JUGA di baris draf (belum disetujui)",
);

// 10b. Draf BELUM LENGKAP: tombol tetap tampil utk admin, tapi backend menolak
const rKosong = execSync(
  `curl -s -X POST ${API}/tambahlaporan -d "idpetugas=2683&judul=E2E Lap Draf Kosong&jenis=tagging&status=draft"`,
).toString();
const idKosong = Number(rKosong.match(/"id":(\d+)/)?.[1] ?? 0);
assert(!!idKosong, `fixture draf belum lengkap id=${idKosong}`);
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
await a.click(`table form:has(input[name="id"][value="${idKosong}"]) button:has-text("Setujui")`);
await a.waitForURL(/error=/, { timeout: 30000 });
assert(
  (await a.locator("body").innerText()).includes("belum lengkap"),
  "setujui draf belum lengkap → ditolak dengan pesan ramah",
);
assert(
  rows(`SELECT status FROM laporan_kegiatan WHERE id=${idKosong}`)[0][0] === "draft",
  "status draf belum lengkap tetap draft",
);

// 11. Admin menyetujui laporan terkirim petugas via tombol cepat
await a.click(`table form:has(input[name="id"][value="${ID}"]) button:has-text("Setujui")`);
await a.waitForURL(/diverifikasi=1/, { timeout: 30000 });
await waitForDb(
  () => rows(`SELECT status FROM laporan_kegiatan WHERE id=${ID}`)[0]?.[0] === "disetujui",
  20000, "status=disetujui via tombol cepat",
);
assert(true, "admin menyetujui laporan petugas via tombol cepat → status=disetujui");
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await a.locator("table span", { hasText: "Disetujui" }).count()) >= 1,
  "chip Disetujui tampil di tabel admin",
);

// 12. Admin mengisi laporan sendiri → tombol approve langsung di form
await a.goto(`${BASE}/admin/laporan/baru`, { waitUntil: "networkidle" });
assert(
  (await a.locator('button:has-text("Kirim & Setujui")').count()) === 1,
  "form admin: tombol Kirim & Setujui tampil",
);
await a.fill('form input[name="judul"]', "E2E Laporan Langsung");
await a.selectOption('form select[name="jenis"]', "pemantauan");
await a.fill('form input[name="tanggal"]', HARI);
await a.click('[data-testid="tambah-hari"]');
await a.fill('[data-testid="entri-teks-0"]', "Uraian laporan admin.");
await a.fill('form input[name="dana"]', "500000");
await a.fill('form textarea[name="hasil"]', "Hasil laporan admin.");
await a.setInputFiles('form input[type=file][accept^="image"]', "/tmp/laporan-e2e.png");
await a.click('button:has-text("Kirim & Setujui")');
await a.waitForURL(/\/admin\/laporan\/\d+\/edit\?disetujui=1/, { timeout: 30000 });
const IDA = Number(a.url().match(/\/admin\/laporan\/(\d+)\/edit/)[1]);
assert(!!IDA, `laporan admin dibuat id=${IDA}`);
await waitForDb(
  () => rows(`SELECT status FROM laporan_kegiatan WHERE id=${IDA}`)[0]?.[0] === "disetujui",
  20000, "admin create langsung disetujui",
);
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${IDA}`)[0][0] === "1",
  20000, "foto laporan admin terunggah",
);
assert(true, "admin mengisi laporan sendiri → langsung disetujui + 1 foto");
assert(
  (await a.locator("text=Disetujui — laporan sudah diperiksa").count()) >= 1,
  "chip Disetujui tampil di halaman edit",
);

// 13. Petugas melihat laporannya sudah disetujui
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await p.locator("table span", { hasText: "Disetujui" }).count()) >= 1,
  "petugas melihat chip Disetujui pada laporannya",
);
assert(
  (await p.locator('button:has-text("Setujui")').count()) === 0,
  "petugas TIDAK punya tombol Setujui di daftar",
);

// 14. Hapus laporan milik sendiri (petugas)
await p.goto(`${BASE}/admin/laporan/${ID}/edit`, { waitUntil: "networkidle" });
await p.click('form:has(input[name="id"]) button:has-text("Hapus Laporan")');
await p.waitForURL(/\/admin\/laporan\?deleted=1/, { timeout: 30000 });
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE id=${ID}`)[0][0] === "0",
  20000, "laporan terhapus",
);
assert(true, "laporan milik sendiri terhapus");
assert(rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`)[0][0] === "0", "foto ikut terhapus (cascade)");

// cleanup fixture admin + draf + laporan admin
execSync(`curl -s -X POST ${API}/hapuslaporan -d "id=${idAdm}" > /dev/null`);
execSync(`curl -s -X POST ${API}/hapuslaporan -d "id=${idDraft}" > /dev/null`);
execSync(`curl -s -X POST ${API}/hapuslaporan -d "id=${idKosong}" > /dev/null`);
execSync(`curl -s -X POST ${API}/hapuslaporan -d "id=${IDA}" > /dev/null`);
assert(
  rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE judul LIKE 'E2E Lap%'`)[0][0] === "0",
  "cleanup: 0 laporan E2E tersisa",
);
assert(
  rows(`SELECT COUNT(*) FROM laporan_foto lf JOIN laporan_kegiatan lk ON lk.id=lf.idlaporan WHERE lk.judul LIKE 'E2E Lap%'`)[0][0] === "0",
  "cleanup: 0 foto E2E tersisa",
);
// file fisik fixture sudah dihapus endpoint hapuslaporan; sisa file crash-run
// ditangani cleanup awal (DB-driven) pada run berikutnya — TANPA glob bebas.

await browser.close();
console.log("\n=== LAPORAN KEGIATAN (FORM CONTOH) LULUS E2E ===");
