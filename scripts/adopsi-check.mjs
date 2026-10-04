// E2E fitur admin "Data Adopsi" (paritas Admin | Data Adoption web lama):
// tabel+filter+cari+pagination, edit baris, hapus baris (pohon dibebaskan),
// panel QR label, export CSV. JWT diinjeksi (pola admin-check.mjs).
// Data dev dikembalikan ke keadaan semula di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
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

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await page.addInitScript(() => {
  // document.documentElement masih null saat init — tunda sampai DOM siap
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

// ================= 1. Tabel + filter + cari =================
const TOTAL = Number(rows("SELECT COUNT(*) FROM data_adopsi")[0][0]);
// fixture dinamis: sertifikat e2e terbaru (urutan certnum naik tiap run)
const [FIX_ID, FIX_NAMA, FIX_CERT, FIX_POHON] = rows(
  "SELECT id, nama, certnum, idpohon FROM data_adopsi WHERE certnum LIKE '%/LPHD-RTK/2026' ORDER BY id DESC LIMIT 1",
)[0] ?? [];
if (!FIX_ID) throw new Error("fixture LPHD-RTK/2026 hilang — jalankan scripts/e2e-adopsi.mjs dulu");

await page.goto(`${BASE}/admin/adopsi`, { waitUntil: "networkidle" });
await page.locator("table tbody tr").first().waitFor({ timeout: 30000 });
const counter = await page.locator("text=/data$/").first().textContent();
assert(
  counter.replace(/\./g, "").startsWith(String(TOTAL)),
  `counter total sesuai DB (${TOTAL}; tampil "${counter.trim()}")`,
);
assert((await page.locator("table tbody tr").count()) === 50, "pagination 50 baris/halaman");
assert(
  (await page.locator("aside nav a", { hasText: "Data Adopsi" }).count()) === 1,
  "menu Data Adopsi di sidebar",
);

const [DESA_BESAR, DESA_N] = rows(
  "SELECT desa, COUNT(*) c FROM data_adopsi GROUP BY desa ORDER BY c DESC LIMIT 1",
)[0];
await page.selectOption("select[aria-label='Filter lokasi']", DESA_BESAR);
await page.waitForTimeout(300);
const counterDesa = await page.locator("text=/data$/").first().textContent();
assert(
  counterDesa.replace(/\./g, "").startsWith(DESA_N),
  `filter desa "${DESA_BESAR}" → ${DESA_N} data`,
);
await page.selectOption("select[aria-label='Filter lokasi']", "semua");
await page.waitForTimeout(300);

const cari = page.locator("input[placeholder^='Cari nama / ID pohon']");
await cari.fill(FIX_CERT);
await page.locator(`table tbody tr:has-text("${FIX_POHON}")`).first().waitFor({ timeout: 10000 });
const certHref = await page
  .locator(`table a[href*="${FIX_CERT}"]`)
  .first()
  .getAttribute("href");
assert(certHref === `/sertifikat/${FIX_CERT.split("/").map(encodeURIComponent).join("/")}`, `link certnum → sertifikat (${certHref})`);
assert((await page.locator("table svg.lucide-tag, table svg[class*='tag']").count()) >= 1, "kolom Tagging berisi ikon");
await page.screenshot({ path: "screenshots/adopsi-tabel.png", fullPage: false });

// ================= 2. Edit baris (ubah + kembalikan) =================
await page.goto(`${BASE}/admin/adopsi/${FIX_ID}/edit`, { waitUntil: "networkidle" });
const namaInput = page.locator("input[name='nama']");
assert((await namaInput.inputValue()) === FIX_NAMA, `edit page terisi (nama "${FIX_NAMA}")`);
await namaInput.fill(`${FIX_NAMA} Edit`);
await page.click("button:has-text('Simpan Perubahan')");
await page.waitForURL("**/admin/adopsi?saved=1", { timeout: 30000 });
assert((await page.locator("text=Perubahan data adopsi tersimpan").count()) === 1, "banner tersimpan tampil");
assert(
  rows(`SELECT nama FROM data_adopsi WHERE id=${FIX_ID}`)[0][0] === `${FIX_NAMA} Edit`,
  "edit tersimpan di DB",
);
// kembalikan via UI
await page.goto(`${BASE}/admin/adopsi/${FIX_ID}/edit`, { waitUntil: "networkidle" });
await page.locator("input[name='nama']").fill(FIX_NAMA);
await page.click("button:has-text('Simpan Perubahan')");
await page.waitForURL("**/admin/adopsi?saved=1", { timeout: 30000 });
assert(rows(`SELECT nama FROM data_adopsi WHERE id=${FIX_ID}`)[0][0] === FIX_NAMA, "nama fixture dikembalikan");

// ================= 3. Hapus baris (dummy pohon ZR999) =================
rows(`DELETE FROM data_adopsi WHERE invoice='#E2EADPSI'`);
rows(`DELETE FROM data_pohon WHERE idpohon='ZR999'`);
rows(
  "INSERT INTO data_pohon (idpohon, desa, localname, diameter, adopted, nama, slope, soil, keterangan, harga, beku, qrcode) VALUES ('ZR999','rantaukermas','Pohon Uji E2E',55,'adopted','Penguji','','','',150000,'','')",
);
rows(
  "INSERT INTO data_adopsi (idpohon, desa, pengasuh, nama, price, cur, methode, tgl_adopt, dur, memo, admin, proses, invoice, tgl_exp) VALUES ('ZR999','rantaukermas',2681,'Uji Hapus E2E',150000,'IDR','Transfer','2026-09-26',1,'',2682,1,'#E2EADPSI','2027-09-26')",
);
const DUMMY_ID = rows("SELECT id FROM data_adopsi WHERE invoice='#E2EADPSI'")[0][0];

await page.goto(`${BASE}/admin/adopsi`, { waitUntil: "networkidle" });
await cari.fill("#E2EADPSI");
await page.locator("table tbody tr:has-text('ZR999')").first().waitFor({ timeout: 10000 });
await page.click("table tbody tr:has-text('ZR999') button:has-text('Hapus')");
await page.waitForURL("**/admin/adopsi?deleted=1", { timeout: 30000 });
assert(rows(`SELECT COUNT(*) FROM data_adopsi WHERE id=${DUMMY_ID}`)[0][0] === "0", "baris adopsi dummy terhapus di DB");
assert(
  rows("SELECT COUNT(*) FROM data_pohon WHERE idpohon='ZR999' AND adopted='available' AND nama=''")[0][0] === "1",
  "pohon ZR999 dikembalikan ke available (nama dikosongkan)",
);
rows(`DELETE FROM data_pohon WHERE idpohon='ZR999'`);
console.log("✓ cleanup dummy ZR999");

// ================= 4. Panel QR =================
await cari.fill(FIX_POHON);
await page.waitForTimeout(300);
await page.click("button:has-text('QR Code')");
const overlay = page.locator(".pa-qr-overlay");
await overlay.waitFor({ timeout: 10000 });
assert(await overlay.isVisible(), "panel QR terbuka");
const nQr = await overlay.locator("svg").count();
assert(nQr >= 1, `QR dirender (${nQr} svg)`);
assert((await overlay.locator("input[aria-label='Base URL QR']").inputValue()) === BASE, "base URL prefill origin");
assert((await overlay.getByText(FIX_POHON).count()) >= 1, "kartu QR memuat kode pohon");
await page.screenshot({ path: "screenshots/adopsi-qr.png", fullPage: false });
await overlay.locator("button[aria-label='Tutup panel QR']").click();
assert((await overlay.count()) === 0 || !(await overlay.isVisible()), "panel QR tertutup");

// ================= 5. Export CSV =================
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 30000 }),
  page.click("[data-testid='export-csv']"),
]);
const csvName = download.suggestedFilename();
const csv = fs.readFileSync(await download.path(), "utf8");
assert(/^data-adopsi-.+-\d{8}\.csv$/.test(csvName), `nama file CSV (${csvName})`);
assert(csv.charCodeAt(0) === 0xfeff, "CSV diawali BOM (Excel)");
assert(csv.includes("ID Pohon") && csv.includes("Certnum"), "CSV memuat header kolom");
assert(csv.includes(FIX_POHON) && csv.includes(FIX_CERT), "CSV memuat baris terfilter");

// ================= 6. Grafik keuangan + baris Total =================
await cari.fill("");
await page.waitForTimeout(300);

// Baris Total vs SQL (semua lokasi, tanpa pencarian)
const [SUM_IDR, SUM_USD] = rows(
  "SELECT SUM(CASE WHEN cur!='USD' THEN IFNULL(price,0) ELSE 0 END), SUM(CASE WHEN cur='USD' THEN IFNULL(price,0) ELSE 0 END) FROM data_adopsi",
)[0];
const totalCell = (await page.locator("[data-testid='total-donasi']").textContent()).replace(
  /\s+/g,
  " ",
);
assert(
  totalCell.replace(/\./g, "").includes(`Rp${SUM_IDR}`),
  `baris Total Rp sesuai DB (Rp${SUM_IDR})`,
);
assert(totalCell.includes(`US$ ${SUM_USD}`), `baris Total US$ sesuai DB (US$ ${SUM_USD})`);

// Bar: satu batang per tahun ber-donasi IDR
const N_TAHUN = rows(
  "SELECT COUNT(DISTINCT YEAR(tgl_adopt)) FROM data_adopsi WHERE cur!='USD' AND price IS NOT NULL AND tgl_adopt IS NOT NULL",
)[0][0];
const nBar = await page.locator("[data-testid='chart-bar'] .recharts-bar-rectangle").count();
assert(nBar === Number(N_TAHUN), `bar total donasi per tahun (${nBar} batang = ${N_TAHUN} tahun)`);

// Donat: filter tahun 2023 (sedikit data → jumlah sektor pasti)
const N_DESA_23 = rows(
  "SELECT COUNT(DISTINCT desa) FROM data_adopsi WHERE cur!='USD' AND price IS NOT NULL AND tgl_adopt IS NOT NULL AND YEAR(tgl_adopt)=2023",
)[0][0];
await page.selectOption("select[aria-label='Filter tahun donat']", "2023");
await page.waitForTimeout(500);
const nSektor = await page.locator("[data-testid='chart-donat'] .recharts-pie-sector").count();
assert(
  nSektor === Math.min(Number(N_DESA_23), 8),
  `donat tahun 2023 → ${nSektor} sektor (${N_DESA_23} desa)`,
);
await page.selectOption("select[aria-label='Filter tahun donat']", "semua");
await page.waitForTimeout(500);

// Bar mengikuti filter lokasi tabel
await page.selectOption("select[aria-label='Filter lokasi']", DESA_BESAR);
await page.waitForTimeout(400);
assert(
  (await page.locator("[data-testid='bar-lokasi']").textContent()).includes(DESA_BESAR),
  `bar chart mengikuti filter lokasi ("${DESA_BESAR}")`,
);
const N_TAHUN_DESA = rows(
  `SELECT COUNT(DISTINCT YEAR(tgl_adopt)) FROM data_adopsi WHERE cur!='USD' AND price IS NOT NULL AND tgl_adopt IS NOT NULL AND desa='${DESA_BESAR}'`,
)[0][0];
const nBarDesa = await page.locator("[data-testid='chart-bar'] .recharts-bar-rectangle").count();
assert(
  nBarDesa === Number(N_TAHUN_DESA),
  `bar utk lokasi ${DESA_BESAR} (${nBarDesa} batang = ${N_TAHUN_DESA} tahun)`,
);
await page.selectOption("select[aria-label='Filter lokasi']", "semua");
await page.waitForTimeout(400);

// Donasi USD tampil sebagai US$
await cari.fill("A007");
await page.waitForTimeout(400);
assert(
  (await page.locator("table tbody tr:has-text('US$')").count()) >= 1,
  "baris donasi USD ditampilkan sebagai US$",
);
await cari.fill("");
await page.waitForTimeout(300);
await page.screenshot({ path: "screenshots/adopsi-grafik.png", fullPage: false });

await browser.close();
console.log("=== SEMUA TES DATA ADOPSI LULUS ===");
