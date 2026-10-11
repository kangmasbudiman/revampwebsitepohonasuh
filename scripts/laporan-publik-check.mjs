// E2E section publik "Laporan Kegiatan": beranda (di bawah Cara Kerja, di
// atas Koleksi) hanya menampilkan laporan status=disetujui + statistik
// agregat; halaman /laporan (semua) + /laporan/[id] (detail + galeri popup);
// laporan terkirim/draft TIDAK tampil & detailnya not-found.
// Butuh: web (E2E_BASE, default :3001) + Laravel API (API_BASE_URL) + MySQL.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
const API_ORIGIN = new URL(API).origin;

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

// ===== fixture (cleanup dulu — sisa run gagal bisa nyangkut) =====
rows(`DELETE FROM laporan_foto WHERE idlaporan IN (SELECT id FROM laporan_kegiatan WHERE judul LIKE 'LAPORAN-PUB-E2E%')`);
rows(`DELETE FROM laporan_kegiatan WHERE judul LIKE 'LAPORAN-PUB-E2E%'`);

const ins = (judul, status, desa, dana, tgl, selesai, jenis) =>
  Number(
    rows(
      `INSERT INTO laporan_kegiatan (idpetugas,judul,jenis,desa,tanggal,tanggal_selesai,isi,dana,hasil,status,created_at,updated_at) VALUES (2683,'${judul}','${jenis}',${desa ? `'${desa}'` : "NULL"},'${tgl}',${selesai ? `'${selesai}'` : "NULL"},'Uraian lengkap kegiatan ${judul} berisi tahapan pelaksanaan di lapangan bersama petugas desa.','${dana}','Hasil nyata ${judul}.','${status}',NOW(),NOW()); SELECT LAST_INSERT_ID()`,
    )[0][0],
  );

const idA = ins("LAPORAN-PUB-E2E Tagging Rantau", "disetujui", "rantaukermas", 500000, "2026-10-05", "2026-10-07", "tagging");
const idB = ins("LAPORAN-PUB-E2E Pemantauan Sirukam", "disetujui", "sirukam", 250000, "2026-10-06", null, "pemantauan");
const idC = ins("LAPORAN-PUB-E2E Masih Kirim", "terkirim", "rantaukermas", 100000, "2026-10-08", null, "tagging");
const idD = ins("LAPORAN-PUB-E2E Masih Draft", "draft", "sirukam", 100000, "2026-10-09", null, "lainnya");
rows(
  `INSERT INTO laporan_foto (idlaporan,url) VALUES (${idA},'${API_ORIGIN}/assets/pohon1.jpg'),(${idA},'${API_ORIGIN}/assets/pohon2.jpg')`,
);
assert(idA > 0 && idB > 0, `fixture: disetujui A=${idA} B=${idB} (terkirim C=${idC}, draft D=${idD})`);

// Ekspektasi agregat (dihitung dari DB — dev DB bersih berarti hanya fixture)
const nSetujui = Number(rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE status='disetujui'`)[0][0]);
const sumDana = Number(rows(`SELECT COALESCE(SUM(dana),0) FROM laporan_kegiatan WHERE status='disetujui'`)[0][0]);
const nDesa = Number(rows(`SELECT COUNT(DISTINCT NULLIF(TRIM(desa),'')) FROM laporan_kegiatan WHERE status='disetujui'`)[0][0]);
const fmtId = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const digits = (s) => (s.match(/\d/g) || []).join("");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// ===== 1. Beranda: section laporan =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
assert((await page.getByText("Transparansi Program", { exact: true }).count()) === 1, "beranda: eyebrow section tampil");

const secLaporan = page.locator("section", { hasText: "Laporan Kegiatan" }).filter({ has: page.getByText("Dana Disalurkan") }).first();
assert((await secLaporan.count()) === 1, "beranda: section laporan ada");

const teksStat = await secLaporan.locator("[data-testid],p,div").first().textContent().catch(() => null);
const statDana = await secLaporan.getByText("Dana Disalurkan", { exact: true }).locator("xpath=..").textContent();
assert(digits(statDana).includes(digits(fmtId(sumDana))), `stat dana = ${fmtId(sumDana)}`);
const statCount = await secLaporan.getByText("Laporan Terverifikasi", { exact: true }).locator("xpath=..").textContent();
assert(digits(statCount).includes(String(nSetujui)), `stat jumlah laporan = ${nSetujui}`);
const statDesa = await secLaporan.getByText("Desa Penerima Manfaat", { exact: true }).locator("xpath=..").textContent();
assert(digits(statDesa).includes(String(nDesa)), `stat desa = ${nDesa}`);

// kartu terbaru: hanya 2 disetujui terbaru (B lebih baru dari A)
assert((await secLaporan.locator("a[href^='/laporan/']").count()) === 2, "beranda: tepat 2 kartu laporan terbaru");
assert((await secLaporan.getByText("LAPORAN-PUB-E2E Pemantauan Sirukam", { exact: true }).count()) === 1, "kartu B (terbaru) tampil");
assert((await secLaporan.getByText("LAPORAN-PUB-E2E Tagging Rantau", { exact: true }).count()) === 1, "kartu A tampil");
assert((await page.getByText("LAPORAN-PUB-E2E Masih Kirim").count()) === 0, "laporan terkirim TIDAK tampil di beranda");
assert((await page.getByText("LAPORAN-PUB-E2E Masih Draft").count()) === 0, "laporan draft TIDAK tampil di beranda");

// urutan section: Cara Kerja < Laporan < Koleksi
const urutan = await page.evaluate(() => {
  const el = (txt) => [...document.querySelectorAll("h2,h3")].find((e) => e.textContent.trim() === txt);
  const cara = el("Cara Kerja Program");
  const lap = el("Laporan Kegiatan");
  const kol = el("Pohon Siap Diadopsi");
  if (!cara || !lap || !kol) return "hilang";
  const setelahCara = cara.compareDocumentPosition(lap) & Node.DOCUMENT_POSITION_FOLLOWING;
  const sebelumKol = kol.compareDocumentPosition(lap) & Node.DOCUMENT_POSITION_PRECEDING;
  return setelahCara && sebelumKol ? "benar" : "salah";
});
assert(urutan === "benar", "posisi: di bawah Cara Kerja, di atas Koleksi");

const linkSemua = secLaporan.getByRole("link", { name: "Lihat Semua Laporan" });
assert((await linkSemua.getAttribute("href")) === "/laporan", "link Lihat Semua Laporan → /laporan");

// ===== 2. Halaman /laporan (semua disetujui) =====
await page.goto(`${BASE}/laporan`, { waitUntil: "networkidle" });
const kartu = page.locator("main a[href^='/laporan/']");
assert((await kartu.count()) === nSetujui, `/laporan: ${nSetujui} kartu (= SQL)`);
assert((await page.getByText("LAPORAN-PUB-E2E Masih Kirim").count()) === 0, "/laporan: terkirim tidak tampil");
assert((await page.getByText("LAPORAN-PUB-E2E Masih Draft").count()) === 0, "/laporan: draft tidak tampil");

// ===== 3. Detail laporan A =====
await page.goto(`${BASE}/laporan/${idA}`, { waitUntil: "networkidle" });
assert((await page.getByRole("heading", { name: "LAPORAN-PUB-E2E Tagging Rantau" }).count()) === 1, "detail: judul A");
const periode = await page.locator("main").textContent();
assert(periode.includes("5 Okt 2026 – 7 Okt 2026"), "detail: periode rentang tampil");
assert(digits(periode).includes(digits(fmtId(500000))), "detail: dana Rp500.000 tampil");
assert(periode.includes("Uraian lengkap kegiatan"), "detail: isi tampil");
assert(periode.includes("Hasil nyata"), "detail: hasil kegiatan tampil");
assert((await page.getByText("Terverifikasi", { exact: true }).count()) >= 1, "detail: badge terverifikasi");

const fotoBtn = page.locator("main button[aria-label^='Lihat foto']");
assert((await fotoBtn.count()) === 2, "detail: 2 foto galeri");
await fotoBtn.first().click();
await page.waitForSelector("[data-testid='popup-foto-laporan']", { timeout: 8000 });
assert(true, "popup galeri terbuka");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
assert((await page.locator("[data-testid='popup-foto-laporan']").count()) === 0, "popup tertutup via Escape");

// ===== 4. Detail laporan non-disetujui → not-found =====
await page.goto(`${BASE}/laporan/${idC}`, { waitUntil: "networkidle" });
assert((await page.getByText("This page could not be found").count()) >= 1, "detail terkirim → 404 not-found");
await page.goto(`${BASE}/laporan/${idD}`, { waitUntil: "networkidle" });
assert((await page.getByText("This page could not be found").count()) >= 1, "detail draft → 404 not-found");

// ===== 5. EN =====
await ctx.addCookies([{ name: "pa_lang", value: "en", url: BASE }]);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
assert((await page.getByText("Program Transparency", { exact: true }).count()) === 1, "EN: eyebrow section");
assert((await page.getByText("Funds Disbursed", { exact: true }).count()) === 1, "EN: judul stat dana");
await page.goto(`${BASE}/laporan`, { waitUntil: "networkidle" });
assert((await page.getByRole("heading", { name: "Activity Reports", exact: true }).count()) === 1, "EN: heading /laporan");

// ===== cleanup =====
rows(`DELETE FROM laporan_foto WHERE idlaporan IN (${idA},${idB},${idC},${idD})`);
rows(`DELETE FROM laporan_kegiatan WHERE id IN (${idA},${idB},${idC},${idD})`);
assert(
  Number(rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE judul LIKE 'LAPORAN-PUB-E2E%'`)[0][0]) === 0,
  "cleanup fixture",
);

await browser.close();
console.log("\n=== SECTION PUBLIK LAPORAN KEGIATAN LULUS E2E ===");
