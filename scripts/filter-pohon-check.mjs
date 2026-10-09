// Uji filter & pencarian Kelola Pohon: cari kode/nama/spesies, filter
// lokasi, status adopsi, unggulan, reset, paginasi, empty state.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};
const sql = (q) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${q}" 2>/dev/null`).toString().trim();
const fmt = (n) => Number(n).toLocaleString("id-ID");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/masuk?next=%2Fadmin`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click('button[type=submit]');
await page.waitForURL("**/admin", { timeout: 20000 });

await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const cari = 'input[aria-label="Cari pohon"]';
const jml = () => page.textContent('[data-testid="jml-pohon"]');

// 1) tanpa filter: jumlah = COUNT DB + info halaman
const total = Number(sql("SELECT COUNT(*) FROM data_pohon"));
ok("jumlah awal = total DB", (await jml()) === `${fmt(total)} pohon`, await jml());
ok("info paginasi Hal 1", (await page.getByText(/Hal 1 dari \d+/).count()) === 1);

// 2) cari kode → jumlah = SQL (kode ATAU nama ATAU spesies), baris memuat nama lokal
const [kodeUji, namaUji] = sql(
  "SELECT idpohon, localname FROM data_pohon WHERE localname IS NOT NULL AND localname<>'' ORDER BY id LIMIT 1",
).split("\t");
await page.fill(cari, kodeUji);
await page.waitForTimeout(400);
const sqlKode = Number(
  sql(
    `SELECT COUNT(*) FROM data_pohon WHERE LOWER(idpohon) LIKE '%${kodeUji.toLowerCase()}%' OR LOWER(localname) LIKE '%${kodeUji.toLowerCase()}%' OR LOWER(IFNULL(species,'')) LIKE '%${kodeUji.toLowerCase()}%'`,
  ),
);
ok(`cari kode ${kodeUji} → jumlah = SQL`, (await jml()) === `${fmt(sqlKode)} pohon`, `${await jml()} vs ${sqlKode}`);
const barisKode = page.locator(`table tbody tr:has-text("${kodeUji}")`).first();
ok("baris kode memuat nama lokal", (await barisKode.textContent()).includes(namaUji));

// 3) cari nama lokal → jumlah identik SQL (kode ATAU nama ATAU spesies)
const needle = namaUji.toLowerCase();
await page.fill(cari, needle);
await page.waitForTimeout(400);
const sqlNama = Number(
  sql(
    `SELECT COUNT(*) FROM data_pohon WHERE LOWER(idpohon) LIKE '%${needle}%' OR LOWER(localname) LIKE '%${needle}%' OR LOWER(IFNULL(species,'')) LIKE '%${needle}%'`,
  ),
);
ok("cari nama → jumlah = SQL", (await jml()) === `${fmt(sqlNama)} pohon`, `${await jml()} vs ${sqlNama}`);

// 4) cari tanpa cocok → empty state + 0 pohon
await page.fill(cari, "ZZZTIDAKADA99");
await page.waitForTimeout(400);
ok("cari tak cocok → 0 pohon", (await jml()) === "0 pohon", await jml());
ok(
  "empty state tampil",
  (await page.locator("table tbody td").textContent()).includes("Tidak ada pohon yang cocok"),
);

// 5) filter lokasi (desa terbesar) → jumlah = SQL + semua baris desa itu
const desaUji = sql("SELECT desa FROM data_pohon GROUP BY desa ORDER BY COUNT(*) DESC LIMIT 1");
await page.fill(cari, "");
await page.selectOption('select[aria-label="Filter lokasi"]', desaUji);
await page.waitForTimeout(400);
const sqlDesa = Number(sql(`SELECT COUNT(*) FROM data_pohon WHERE desa='${desaUji}'`));
ok(`filter lokasi ${desaUji} → jumlah = SQL`, (await jml()) === `${fmt(sqlDesa)} pohon`, `${await jml()} vs ${sqlDesa}`);
const lokasiSel = await page.locator("table tbody tr td:nth-child(3)").allTextContents();
// sel lokasi kini ditampilkan Title Case (namaDesa) — bandingkan case-insensitive
ok("semua baris halaman = desa terfilter", lokasiSel.every((t) => t.trim().toLowerCase() === desaUji.toLowerCase()), `${lokasiSel.length} baris`);

// 6) kombinasi lokasi + status tersedia
await page.selectOption('select[aria-label="Filter status adopsi"]', "AVAILABLE");
await page.waitForTimeout(400);
const sqlKombinasi = Number(
  sql(`SELECT COUNT(*) FROM data_pohon WHERE desa='${desaUji}' AND adopted='available'`),
);
ok("lokasi + status tersedia → jumlah = SQL", (await jml()) === `${fmt(sqlKombinasi)} pohon`, `${await jml()} vs ${sqlKombinasi}`);
const badgeSel = await page.locator("table tbody tr td:nth-child(4)").allTextContents();
ok("semua badge = Tersedia", badgeSel.every((t) => t.includes("Tersedia")), `${badgeSel.length} baris`);

// 7) reset → kembali total
await page.click('button[aria-label="Reset filter"]');
await page.waitForTimeout(400);
ok("reset → jumlah = total", (await jml()) === `${fmt(total)} pohon`, await jml());

// 8) filter unggulan → jumlah = COUNT(highlight=1) + tombol ★ Unggulan di baris
await page.selectOption('select[aria-label="Filter unggulan"]', "unggulan");
await page.waitForTimeout(400);
const sqlUnggulan = Number(sql("SELECT COUNT(*) FROM data_pohon WHERE highlight=1"));
ok("filter unggulan → jumlah = SQL", (await jml()) === `${fmt(sqlUnggulan)} pohon`, `${await jml()} vs ${sqlUnggulan}`);
if (sqlUnggulan > 0) {
  ok(
    "baris memuat tombol ★ Unggulan",
    (await page.locator('table tbody button:has-text("Unggulan")').count()) >= 1,
  );
}

// 9) paginasi: tombol awal/akhir
await page.selectOption('select[aria-label="Filter unggulan"]', "semua");
await page.waitForTimeout(400);
const sebelumnya = page.locator("button", { hasText: "Sebelumnya" });
ok("Sebelumnya disabled di hal 1", await sebelumnya.isDisabled());

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
