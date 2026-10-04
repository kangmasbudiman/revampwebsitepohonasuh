// Uji PRODUKSI (pohonasuh.io): tambah pohon + foto 2MB lewat UI — v2 (sql fix + tangkap error).
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = "https://pohonasuh.io";
const KODE = "VPSU01";
const FOTO = "/tmp/uji-2mb.jpg";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};
const PW = execSync(
  `ssh pohonasuh-vps "grep '^MYSQL_ROOT_PASSWORD=' /var/www/apps/pohonasuh/.env | cut -d= -f2"`,
).toString().trim();
const sql = (q) =>
  execSync(
    `ssh pohonasuh-vps "docker exec pohonasuh-mysql mysql -uroot -p'${PW}' -N -e \\"${q}\\"" 2>/dev/null`,
  ).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tungguDb(query, expected, timeoutMs = 25000) {
  const mulai = Date.now();
  while (Date.now() - mulai < timeoutMs) {
    try { if (sql(query) === expected) return true; } catch {}
    await sleep(700);
  }
  return false;
}

try { sql(`DELETE FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`); } catch {}
execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/pohon/pohon_${KODE}_*.jpg"`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("response", (r) => {
  if (r.status() >= 400) console.log(`HTTP ${r.status()} — ${r.request().method()} ${r.url().slice(0, 90)}`);
});

await page.goto(`${BASE}/masuk?next=%2Fadmin`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click('button[type=submit]');
await page.waitForURL("**/admin", { timeout: 20000 });
ok("login admin produksi", true);

await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.click("summary:has-text('Tambah Pohon Baru')");
await page.fill('input[name="idpohon"]', KODE);
await page.fill('input[name="localName"]', "Uji VPS 2MB");
await page.selectOption('select[name="desa"]', { label: "longlake" });
await page.fill('input[name="priceIdr"]', "150000");
await page.setInputFiles('input[name="foto"]', FOTO);
await page.click('button[type=submit]:has-text("Tambah Pohon")');
await page.waitForTimeout(12000);

const errUi = await page.locator("form p, form div").filter({ hasText: /gagal|error|maksimal|tidak/i }).first().textContent().catch(() => null);
console.log("PESAN-UI:", errUi?.trim()?.slice(0, 150) ?? "(tidak ada pesan error)");
await page.screenshot({ path: "screenshots/vps-tambah-foto.png", fullPage: true });

const masuk = await tungguDb(`SELECT COUNT(*) FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`, "1", 3000);
ok("pohon masuk DB produksi", masuk);
const naik = await tungguDb(
  `SELECT COUNT(*) FROM pohonasuh.data_pohon WHERE idpohon='${KODE}' AND foto_pohon LIKE 'https://rest.pohonasuh.io/upload/pohon/%'`,
  "1",
  3000,
);
ok("foto 2MB terupload → foto_pohon berisi URL", naik);

const popup = page.locator('div[role="dialog"][aria-label="Pohon tersimpan"]');
ok("popup sukses tambah tampil", (await popup.count()) === 1);
if ((await popup.count()) === 1) await popup.locator('button:has-text("Selesai")').click().catch(() => {});

if (naik) {
  const fotoUrl = sql(`SELECT foto_pohon FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`);
  const curl = execSync(`curl -sk -o /dev/null -w "%{http_code}" "${fotoUrl}"`).toString().trim();
  ok("URL foto bisa diakses (200)", curl === "200", `${curl}`);
  await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
  await page.fill('input[aria-label="Cari pohon"]', KODE);
  await page.waitForTimeout(600);
  const src = await page.locator(`table tbody tr:has-text("${KODE}") img`).first().getAttribute("src");
  ok("thumbnail tabel = foto upload", !!src && !src.includes("no-image-icon"), String(src)?.slice(0, 60));
}

// cleanup
sql(`DELETE FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`);
execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/pohon/pohon_${KODE}_*.jpg"`);
ok("data uji dibersihkan", sql(`SELECT COUNT(*) FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`) === "0");

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS (PRODUKSI)" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
