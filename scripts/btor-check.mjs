// E2E alur Order Tagging → BTOR + Memo Pencairan (Laporan Kegiatan jenis
// tagging): kelompok pilih pohon di /admin/tagging → draft laporan otomatis
// (lampiran = foto tagging per kode pohon, tanpa unggah manual) → lengkapi
// BTOR → kirim (validasi: semua pohon wajib berfoto) → widget/badge
// notifikasi admin → detail (stepper + tab) → minta revisi → kirim ulang →
// verifikasi → terbitkan memo → status pencairan dicairkan → riwayat →
// publik /laporan/[id] → hapus. Jalankan:
//   E2E_BASE=http://localhost:3001 node scripts/btor-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.E2E_API ?? "http://127.0.0.1:8001/api";
const SHOT = process.env.E2E_SHOT ?? "/tmp";

let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

// Bersihkan sisa laporan E2E dari run gagal sebelumnya (via API flat).
const bersihkan = async () => {
  const rows = await (await fetch(`${API}/laporanlist`)).json();
  for (const r of rows) {
    const judul = String(r.judul ?? "");
    // Draft otomatis dari Order Tagging (run gagal sebelum sempat diganti
    // judul) ikut dibersihkan — hanya milik akun E2E.
    if (
      judul.startsWith("E2E BTOR") ||
      (judul.startsWith("Kegiatan Tagging — ") && Number(r.idpetugas) === 2682)
    ) {
      await fetch(`${API}/hapuslaporan`, {
        method: "POST",
        body: new URLSearchParams({ id: String(r.id) }),
      });
    }
  }
};
await bersihkan();

const browser = await chromium.launch();
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminCtx.addCookies([
  { name: "pa_session", value: await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE },
]);
const a = await adminCtx.newPage();
const anon = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const JUDUL = `E2E BTOR ${Date.now()}`;
const TEMPAT = "Hutan Nagari Pondok Parian (E2E)";
const NOREK = "5482-01-014034-53-3";
const CATATAN_REVISI = `Lengkapi foto dokumentasi tagging. (${Date.now()})`;
const hariIni = new Date().toISOString().slice(0, 10);

// ===== 1. Order Tagging: pilih pohon → draft Laporan Kegiatan → kirim =====
// Kandidat = order adopsi terverifikasi + foto tagging per kode pohon
// (scope siklus order) — sumber sama dengan menu Order Tagging.
const ordResp = await (
  await fetch(`${API}/ordercustomerbypengurus`, {
    method: "POST",
    body: new URLSearchParams({ iduser: "2682", semua: "1" }),
  })
).json();
const ords = ordResp.filter((o) => String(o.confirmasi ?? "") === "yes");
const fotoByAdopsi = {};
await Promise.all(
  [...new Set(ords.map((o) => o.invoice))].map(async (inv) => {
    const rows = await (
      await fetch(`${API}/fototagingorder`, {
        method: "POST",
        body: new URLSearchParams({ invoice: inv }),
      })
    ).json();
    for (const r of rows) fotoByAdopsi[Number(r.idadopsi)] = (r.foto ?? []).length;
  }),
);
const berfoto = ords.filter((o) => (fotoByAdopsi[Number(o.id)] ?? 0) > 0).slice(0, 2);
if (berfoto.length < 2) throw new Error("butuh minimal 2 order terverifikasi berfoto tagging");
const belum = ords.find(
  (o) => (fotoByAdopsi[Number(o.id)] ?? 0) === 0 && Number(o.proses) !== 3,
);

await a.goto(`${BASE}/admin/tagging`, { waitUntil: "domcontentloaded", timeout: 60000 });
await a.waitForSelector('[data-testid="check-laporan"]', { timeout: 60000 });
for (const k of berfoto) {
  await a
    .locator(
      `div.rounded-2xl:has(span.font-mono:text-is("${k.idpohon}")) [data-testid="check-laporan"] input`,
    )
    .check();
}
ok(
  "tagging: bar buat laporan muncul",
  (await a.locator('[data-testid="buat-laporan-tagging"]').count()) === 1,
);
await a.click('[data-testid="buat-laporan-tagging"]');
await a.waitForURL(/\/admin\/laporan\/\d+\/edit\?created=1/, { timeout: 60000 });
const id = Number(a.url().match(/\/admin\/laporan\/(\d+)\/edit/)?.[1]);
ok("tagging: draft laporan dibuat dari seleksi pohon", id > 0, `id=${id}`);
const judulAwal = (await a.locator('input[name="judul"]').inputValue()) ?? "";
ok("tagging: judul draft otomatis", judulAwal.startsWith("Kegiatan Tagging — "), judulAwal.slice(0, 44));

// Lengkapi BTOR pada draft.
await a.fill('input[name="judul"]', JUDUL);
ok("form: jenis tagging", (await a.locator('select[name="jenis"]').inputValue()) === "tagging");
await a.locator('select[name="desa"]').selectOption({ index: 1 });
await a.fill('input[name="tanggal"]', hariIni);
await a.fill('input[name="tanggal_selesai"]', hariIni);
await a.fill('input[name="jabatan"]', "Ketua LPHN (E2E)");
await a.fill('input[name="tempat"]', TEMPAT);
await a.fill('textarea[name="tim_tagging"]', "Saprudin\nJal\nYus");
await a.fill('input[name="rekening_at"]', "LPHN Pondok Parian (E2E)");
await a.fill('input[name="rekening_bank"]', "BRI");
await a.fill('input[name="rekening_norek"]', NOREK);
// editor timeline: 2 entri bertanggal → serialisasi "08 April: …\n09 April: …"
await a.click('[data-testid="tambah-hari"]');
await a.fill('[data-testid="entri-tanggal-0"]', `${new Date().getFullYear()}-04-08`);
await a.fill('[data-testid="entri-teks-0"]', "perjalanan dan mendirikan camp di Pondok Parian.");
await a.click('[data-testid="tambah-hari"]');
await a.fill('[data-testid="entri-tanggal-1"]', `${new Date().getFullYear()}-04-09`);
await a.fill('[data-testid="entri-teks-1"]', "tagging 65 pohon bersama tim kelompok tani.");
ok(
  "form: entri terurut naik by tanggal (08 sebelum 09)",
  (await a.locator('[data-testid="entri-tanggal-0"]').inputValue()) < (await a.locator('[data-testid="entri-tanggal-1"]').inputValue()),
);
await a.fill('input[name="dana"]', "1500000");
await a.fill('textarea[name="hasil"]', "65 pohon tertandai papan nama; 3 anggota kelompok tani terlatih.");

ok(
  "form: picker preselect 2 pohon dari draft",
  ((await a.locator('[data-testid="picker-terpilih"]').textContent()) ?? "").includes("2 pohon dipilih"),
);
ok(
  "form: lampiran otomatis 2 dari 2 pohon berfoto",
  ((await a.locator('[data-testid="progress-foto-tagging"]').textContent()) ?? "").includes("2 dari 2"),
);
ok("form: tanpa unggah foto manual", (await a.locator('form input[type=file]').count()) === 0);

// Validasi: pohon yang belum difoto menahan pengiriman.
const cekKode = (kode) =>
  a
    .locator("ul.divide-y")
    .getByText(kode, { exact: true })
    .first()
    .locator("xpath=ancestor::li[1]")
    .locator("input[type=checkbox]");
let validasiOk = true;
if (belum) {
  await cekKode(berfoto[0].idpohon).uncheck();
  await cekKode(belum.idpohon).check();
  await a.click('button[value="terkirim"]');
  await a.waitForSelector("text=harus sudah punya foto tagging", { timeout: 15000 });
  await cekKode(belum.idpohon).uncheck();
  await cekKode(berfoto[0].idpohon).check();
} else {
  validasiOk = false;
}
ok("validasi: pohon belum difoto menahan kirim", validasiOk, belum ? "" : "dilewati: semua order sudah berfoto");

await a.click('button[value="terkirim"]');
await a.waitForURL(/\?dikirim=1/, { timeout: 60000 });
ok("form: laporan terkirim dari draft", true);

// ===== 2. Notifikasi admin: widget dashboard + badge menu =====
await a.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
ok("dashboard: widget laporan menunggu tampil", (await a.locator('[data-testid="widget-laporan-menunggu"]').count()) === 1);
ok("sidebar: badge angka pada menu Laporan Kegiatan", (await a.locator('[data-testid="nav-badge-laporan"]').count()) === 1);

// ===== 3. Halaman detail (status terkirim) =====
await a.goto(`${BASE}/admin/laporan/${id}`, { waitUntil: "networkidle" });
ok("detail: status Terkirim", ((await a.locator('[data-testid="detail-status"]').textContent()) ?? "").trim() === "Terkirim");
const stepDone = async (n) =>
  a.evaluate(
    (i) => {
      const p = document.querySelector(`[data-testid="stepper-${i}"]`);
      return !!p && (p.className.includes("text-emerald-800") || p.className.includes("text-emerald-300"));
    },
    n,
  );
ok("detail: stepper tahap 1 done", await stepDone(1));
ok("detail: stepper tahap 2 belum", !(await stepDone(2)));
ok("detail: info strip memuat tempat BTOR", (await a.locator("main").textContent()).includes(TEMPAT));
ok("detail: aksi Verifikasi BTOR tampil", (await a.locator('button:has-text("Verifikasi BTOR")').count()) === 1);
ok("detail: aksi Minta Revisi tampil", (await a.locator('summary:has-text("Minta Revisi")').count()) === 1);
ok("detail: tombol Lihat BTOR tampil", (await a.locator('[data-testid="lihat-btor"]').count()) === 1);
{
  const [pdfTab] = await Promise.all([
    adminCtx.waitForEvent("page", { timeout: 15000 }),
    a.click('[data-testid="lihat-btor"]'),
  ]);
  ok("detail: pratinjau BTOR (PDF) terbuka di tab baru", Boolean(pdfTab));
  await pdfTab?.close();
}
{
  const [dl] = await Promise.all([
    a.waitForEvent("download", { timeout: 30000 }),
    a.click('[data-testid="unduh-laporan-pdf"]'),
  ]);
  ok("pdf: nama file btor", dl.suggestedFilename().startsWith("btor-"), dl.suggestedFilename());
  const pdf = fs.readFileSync(await dl.path()).toString("latin1");
  ok("pdf: tabel identitas memuat Catatan Penting", pdf.includes("Catatan Penting"));
  ok("pdf: halaman lampiran foto ada", pdf.includes("LAMPIRAN FOTO"));
  ok("pdf: lampiran memuat kode pohon terpilih", pdf.includes(berfoto[0].idpohon));
  ok("pdf: minimal 2 halaman (utama + lampiran)", (pdf.match(/\/Type\s*\/Page(?![s])/g) ?? []).length >= 2);
}
ok("detail: 5 tab tersedia", (await a.locator('[data-testid="laporan-tabs"] [role=tab]').count()) === 5);
ok("detail: tab Ringkasan jumlah pohon", ((await a.locator('[data-testid="detail-jml-pohon"]').textContent()) ?? "").trim() === "2 pohon");
ok("detail: dana terformat", ((await a.locator('[data-testid="detail-dana"]').textContent()) ?? "").includes("1.500.000"));

// Galeri foto hasil tagging pohon (admin periksa bukti tagging per pohon).
await a.locator('[data-testid="lihat-foto-tagging"]').first().click();
await a.waitForSelector('[data-testid="popup-foto-laporan"]', { timeout: 15000 });
ok(
  "detail: counter galeri foto tagging aktif",
  ((await a.locator('[data-testid="popup-foto-counter"]').textContent()) ?? "").includes("1 /"),
);
await a.keyboard.press("Escape");
ok("detail: galeri foto tagging tertutup", (await a.locator('[data-testid="popup-foto-laporan"]').count()) === 0);

await a.click('button[role=tab]:has-text("Memo")');
ok("detail: tab Memo empty state sebelum verifikasi", (await a.locator('[data-testid="tab-panel-memo"]').textContent()).includes("setelah BTOR diverifikasi"));

// Publik belum boleh melihat laporan terkirim (status stream tetap 200 di
// dev — cek konten not-found, bukan kode HTTP).
await anon.goto(`${BASE}/laporan/${id}`, { waitUntil: "networkidle" });
const teksTerkirim = (await anon.locator("body").textContent()) ?? "";
ok(
  "publik: tidak tampil sebelum disetujui",
  teksTerkirim.includes("tidak ditemukan") && !teksTerkirim.includes(JUDUL),
);

// ===== 4. Minta revisi =====
await a.click('summary:has-text("Minta Revisi")');
await a.fill('input[name="catatan"]', CATATAN_REVISI);
await a.click('button:has-text("Kirim Permintaan Revisi")');
await a.waitForURL(/\?revisi=1/, { timeout: 30000 });
ok("revisi: status Perlu Revisi", ((await a.locator('[data-testid="detail-status"]').textContent()) ?? "").trim() === "Perlu Revisi");
ok("revisi: catatan admin tampil", (await a.locator("main").textContent()).includes(CATATAN_REVISI));

// ===== 5. Petugas memperbaiki & kirim ulang via halaman edit =====
await a.goto(`${BASE}/admin/laporan/${id}/edit`, { waitUntil: "networkidle" });
ok("edit: banner Perlu revisi + catatan", (await a.locator("main").textContent()).includes(CATATAN_REVISI));
await a.click('button[value="terkirim"]');
await a.waitForURL(/\?saved=1/, { timeout: 60000 });
await a.goto(`${BASE}/admin/laporan/${id}`, { waitUntil: "networkidle" });
ok("kirim ulang: status kembali Terkirim", ((await a.locator('[data-testid="detail-status"]').textContent()) ?? "").trim() === "Terkirim");
ok("kirim ulang: catatan revisi terhapus", !(await a.locator("main").textContent()).includes(CATATAN_REVISI));

// ===== 6. Verifikasi BTOR =====
await a.click('button:has-text("Verifikasi BTOR")');
await a.locator("[data-confirm-submit]").click();
await a.waitForURL(/\?diverifikasi=1/, { timeout: 30000 });
ok("verifikasi: status Disetujui", ((await a.locator('[data-testid="detail-status"]').textContent()) ?? "").trim() === "Disetujui");
ok("verifikasi: stepper tahap 2 done", await stepDone(2));

// ===== 7. Terbitkan Memo Pencairan =====
await a.click('button[role=tab]:has-text("Memo")');
const memoForm = a.locator('form:has(input[name="ttd_nama"])');
await memoForm.locator('input[name="ttd_nama"]').fill("Admin Pohon Asuh");
await memoForm.locator('input[name="ttd_jabatan"]').fill("Koordinator Program");
await memoForm.locator('button:has-text("Terbitkan Memo")').click();
await a.waitForURL(/\?memo=1/, { timeout: 30000 });
// Redirect me-reset tab ke Ringkasan — buka kembali tab Memo.
await a.click('button[role=tab]:has-text("Memo")');
ok("memo: kartu memo + nomor tampil", (await a.locator('[data-testid="memo-card"]').textContent()).includes("MEMO/"));
const teksMemoCard = (await a.locator('[data-testid="memo-card"]').textContent()) ?? "";
ok("memo: format memorandum (Dari/Kepada)", teksMemoCard.includes("Dari") && teksMemoCard.includes("Kepada") && teksMemoCard.includes("Proyek"));
ok("memo: isi template tagging terisi", teksMemoCard.includes("banner tagging"));
ok("memo: jumlah = dana BTOR", ((await a.locator('[data-testid="memo-jumlah"]').textContent()) ?? "").includes("1.500.000"));
ok("memo: status awal menunggu", ((await a.locator('[data-testid="memo-status"]').textContent()) ?? "").includes("Menunggu"));
ok("memo: tombol unduh PDF tampil", (await a.locator('[data-testid="unduh-memo-pdf"]').count()) === 1);
ok("memo: stepper tahap 3 done", await stepDone(3));
ok("memo: stepper tahap 4 belum", !(await stepDone(4)));

// ===== 8. Update status pencairan → dicairkan =====
const cairForm = a.locator('form:has(select[name="status_pencairan"])');
await cairForm.locator('select[name="status_pencairan"]').selectOption("dicairkan");
await cairForm.locator('input[name="catatan_pencairan"]').fill("Ditransfer via BRI (E2E)");
await cairForm.locator('button:has-text("Perbarui")').click();
await a.waitForURL(/\?pencairan=1/, { timeout: 30000 });
await a.click('button[role=tab]:has-text("Memo")');
ok("pencairan: status Dana dicairkan", ((await a.locator('[data-testid="memo-status"]').textContent()) ?? "").includes("Dana dicairkan"));
ok("pencairan: stepper tahap 4 done", await stepDone(4));

// ===== 9. Riwayat proses =====
await a.click('button[role=tab]:has-text("Riwayat")');
const teksRiwayat = (await a.locator('[data-testid="tab-panel-riwayat"]').textContent()) ?? "";
for (const label of ["BTOR dikirim", "Diminta revisi", "BTOR diverifikasi", "Memo diterbitkan", "Status pencairan diperbarui"]) {
  ok(`riwayat: "${label}" tercatat`, teksRiwayat.includes(label));
}

// ===== 10. Screenshot detail (light & dark) =====
await a.click('button[role=tab]:has-text("Ringkasan")');
await a.screenshot({ path: `${SHOT}/btor-detail-light.png`, fullPage: true });
await a.evaluate(() => localStorage.setItem("pa_theme", "dark"));
await a.reload({ waitUntil: "networkidle" });
ok("dark mode: kelas dark aktif", await a.evaluate(() => document.documentElement.classList.contains("dark")));
await a.screenshot({ path: `${SHOT}/btor-detail-dark.png`, fullPage: true });
await a.evaluate(() => localStorage.setItem("pa_theme", "light"));
await a.reload({ waitUntil: "networkidle" });

// ===== 11. Halaman publik /laporan/[id] =====
await anon.goto(`${BASE}/laporan/${id}`, { waitUntil: "networkidle" });
const publikTeks = (await anon.locator("main").textContent()) ?? "";
ok("publik: judul + terverifikasi tampil", publikTeks.includes(JUDUL) && publikTeks.includes("Terverifikasi"));
ok("publik: tempat BTOR tampil", publikTeks.includes(TEMPAT));
ok("publik: ringkasan N pohon ditagging", publikTeks.includes("2 pohon ditagging"));
ok("publik: data finansial (rekening) tidak bocor", !publikTeks.includes(NOREK));

// ===== 12. Cleanup: hapus laporan uji =====
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
{
  const [pdfTab] = await Promise.all([
    adminCtx.waitForEvent("page", { timeout: 15000 }),
    a.locator(`tr:has-text("${JUDUL}") [data-testid="lihat-btor"]`).first().click(),
  ]);
  ok("tabel: tombol BTOR buka pratinjau di tab baru", Boolean(pdfTab));
  await pdfTab?.close();
}
await a.locator(`tr:has-text("${JUDUL}") button:has-text("Hapus")`).first().click();
await a.locator("[data-confirm-submit]").click();
await a.waitForURL(/\?deleted=1/, { timeout: 30000 });
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
ok("cleanup: laporan uji terhapus", (await a.locator(`text=${JUDUL}`).count()) === 0);
await anon.goto(`${BASE}/laporan/${id}`, { waitUntil: "networkidle" });
const teksHapus = (await anon.locator("body").textContent()) ?? "";
ok("cleanup: publik kembali tidak ditemukan", teksHapus.includes("tidak ditemukan"));

await browser.close();
if (gagal) {
  console.error(`\n=== GAGAL: ${gagal} asersi ===`);
  process.exit(1);
}
console.log("\n=== SEMUA TAHAP E2E BTOR + MEMO LULUS ===");
