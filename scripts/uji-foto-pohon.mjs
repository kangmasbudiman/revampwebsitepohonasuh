// Uji fitur foto Kelola Pohon: thumbnail tabel, tambah tanpa foto (default),
// upload foto saat edit, URL field bersih untuk foto default.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const KODE = "UJF001"; // idpohon varchar(7) — kode maks 7 char
const FOTO = "/tmp/uji-foto-pohon.jpg";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};
const sql = (q) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${q}" 2>/dev/null`).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// tunggu query SQL mengembalikan nilai yang diharapkan (hindari race server action)
async function tungguDb(query, expected, timeoutMs = 15000) {
  const mulai = Date.now();
  while (Date.now() - mulai < timeoutMs) {
    try {
      if (sql(query) === expected) return true;
    } catch {}
    await sleep(400);
  }
  return false;
}

// cleanup sisa run lama
try { sql(`DELETE FROM data_pohon WHERE idpohon IN ('${KODE}','UJIFOTO01','CURLTEST1')`); } catch {}
execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/upload/pohon/pohon_${KODE}_*.jpg /opt/homebrew/var/www/restApiPohonasuh/public/upload/pohon/pohon_UJIFOTO01_*.jpg`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/masuk?next=%2Fadmin`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click('button[type=submit]');
await page.waitForURL("**/admin", { timeout: 20000 });

// 1) tabel Kelola Pohon: thumbnail tampil & termuat
await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const thumbs = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("table tbody tr td img")];
  return {
    total: imgs.length,
    rusak: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
  };
});
ok("thumbnail tabel tampil (>=50)", thumbs.total >= 50, `${thumbs.total} img`);
ok("thumbnail semua termuat", thumbs.rusak === 0, `${thumbs.rusak} rusak`);

// 2) tambah pohon TANPA foto → DB kosong + baris tabel pakai gambar default
await page.click("summary:has-text('Tambah Pohon Baru')");
ok(
  "input kode dibatasi 7 karakter (varchar(7))",
  (await page.getAttribute('input[name="idpohon"]', "maxlength")) === "7",
);
await page.fill('input[name="idpohon"]', KODE);
await page.fill('input[name="localName"]', "Uji Foto Pohon");
await page.selectOption('select[name="desa"]', { label: "rantaukermas" });
await page.fill('input[name="priceIdr"]', "150000");
await page.click('button[type=submit]:has-text("Tambah Pohon")');
// waitForURL instan (URL sudah /admin/pohon) — tunggu baris benar-benar masuk DB
const masuk = await tungguDb(`SELECT COUNT(*) FROM data_pohon WHERE idpohon='${KODE}'`, "1");
ok("pohon baru masuk DB", masuk);
// popup sukses tambah muncul (?created=) lalu bisa ditutup
const popupTambah = page.locator('div[role="dialog"][aria-label="Pohon tersimpan"]');
await popupTambah.waitFor({ timeout: 10000 }).catch(() => {});
ok("popup sukses tambah tampil", (await popupTambah.count()) === 1);
ok("popup tambah memuat kode pohon", ((await popupTambah.textContent()) ?? "").includes(KODE));
await popupTambah.locator('button:has-text("Selesai")').click();
let popupTertutup = false;
for (let i = 0; i < 20 && !popupTertutup; i++) {
  await page.waitForTimeout(400);
  popupTertutup =
    (await page.locator("div[role=dialog]").count()) === 0 && !page.url().includes("created=");
}
ok("popup tambah tertutup + param bersih", popupTertutup);
const fotoDb = sql(
  `SELECT CONCAT('[',IFNULL(foto_pohon,''),']') FROM data_pohon WHERE idpohon='${KODE}'`,
);
ok("tambah tanpa foto → foto_pohon kosong di DB", fotoDb === "[]", fotoDb);

// cari baris lewat kotak filter (tabel client-side)
await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.fill('input[aria-label="Cari pohon"]', KODE);
await page.waitForTimeout(400);
const baris = page.locator(`table tbody tr:has-text("${KODE}")`);
ok("baris pohon baru tampil di tabel", (await baris.count()) >= 1);
const srcDefault = await baris.locator("img").first().getAttribute("src");
ok("thumbnail baris = gambar default", !!srcDefault && srcDefault.includes("no-image-icon-23483.png"), String(srcDefault));

// 3) edit: URL field kosong (bukan URL default), lalu upload foto
await page.goto(`${BASE}/admin/pohon/${KODE}`, { waitUntil: "networkidle" });
const urlVal = await page.inputValue('input[name="photoUrl"]');
ok("kolom URL kosong utk pohon tanpa foto", urlVal === "", JSON.stringify(urlVal));
const preview = await page.locator("main img").first().getAttribute("src");
ok("preview halaman edit = default", !!preview && preview.includes("no-image-icon"), String(preview));

await page.setInputFiles('input[name="foto"]', FOTO);
await page.click('button[type=submit]:has-text("Simpan Perubahan")');
const naik = await tungguDb(
  `SELECT COUNT(*) FROM data_pohon WHERE idpohon='${KODE}' AND foto_pohon LIKE 'http://127.0.0.1:8000/upload/pohon/%'`,
  "1",
  20000,
);
ok("upload → DB foto_pohon = URL upload", naik);
// popup sukses edit muncul (?saved=1) di halaman yang sama
const popupEdit = page.locator('div[role="dialog"][aria-label="Pohon tersimpan"]');
await popupEdit.waitFor({ timeout: 10000 }).catch(() => {});
ok("popup sukses edit tampil", (await popupEdit.count()) === 1);
await popupEdit.locator('button:has-text("Selesai")').click();
const fotoBaru = sql(`SELECT foto_pohon FROM data_pohon WHERE idpohon='${KODE}'`);
const adaFile = execSync(
  `ls /opt/homebrew/var/www/restApiPohonasuh/public/upload/pohon/pohon_${KODE}_*.jpg 2>/dev/null | wc -l`,
).toString().trim();
ok("file tersimpan di public/upload/pohon", adaFile === "1");
const curl = execSync(`curl -s -o /dev/null -w "%{http_code}" "${fotoBaru}"`).toString().trim();
ok("URL foto bisa diakses (200)", curl === "200", curl);

// 4) reload edit: kolom URL berisi URL upload, preview = foto baru
await page.goto(`${BASE}/admin/pohon/${KODE}`, { waitUntil: "networkidle" });
const urlVal2 = await page.inputValue('input[name="photoUrl"]');
ok("kolom URL berisi URL upload", urlVal2 === fotoBaru, urlVal2);
await page.waitForTimeout(1500);
const preview2 = await page.locator("main img").first();
ok("preview = foto upload (termuat)", (await preview2.getAttribute("src"))?.includes("_next/image") ?? false);
const termuat = await page.evaluate(() =>
  [...document.querySelectorAll("main img")].every((i) => i.complete && i.naturalWidth > 0),
);
ok("semua img halaman edit termuat", termuat);

// 5) tabel: thumbnail baris kini foto upload (bukan default)
await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.fill('input[aria-label="Cari pohon"]', KODE);
await page.waitForTimeout(400);
const srcBaru = await page.locator(`table tbody tr:has-text("${KODE}") img`).first().getAttribute("src");
ok("thumbnail tabel = foto baru", !!srcBaru && !srcBaru.includes("no-image-icon"), String(srcBaru)?.slice(0, 80));

// 5b) tambah pohon DENGAN foto langsung → DB foto_pohon = URL upload
const KODE2 = "UJF002";
try { sql(`DELETE FROM data_pohon WHERE idpohon='${KODE2}'`); } catch {}
execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/upload/pohon/pohon_${KODE2}_*.jpg`);
await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.click("summary:has-text('Tambah Pohon Baru')");
await page.fill('input[name="idpohon"]', KODE2);
await page.fill('input[name="localName"]', "Uji Tambah Berfoto");
await page.selectOption('select[name="desa"]', { label: "rantaukermas" });
await page.fill('input[name="priceIdr"]', "150000");
await page.setInputFiles('input[name="foto"]', FOTO);
await page.click('button[type=submit]:has-text("Tambah Pohon")');
const masuk2 = await tungguDb(`SELECT COUNT(*) FROM data_pohon WHERE idpohon='${KODE2}'`, "1");
ok("tambah berfoto → pohon masuk DB", masuk2);
const naik2 = await tungguDb(
  `SELECT COUNT(*) FROM data_pohon WHERE idpohon='${KODE2}' AND foto_pohon LIKE 'http://127.0.0.1:8000/upload/pohon/%'`,
  "1",
  20000,
);
ok("tambah + upload → DB foto_pohon = URL upload", naik2);
const foto2 = sql(`SELECT foto_pohon FROM data_pohon WHERE idpohon='${KODE2}'`);
const curl2 = execSync(`curl -s -o /dev/null -w "%{http_code}" "${foto2}"`).toString().trim();
ok("URL foto tambah bisa diakses (200)", curl2 === "200", curl2);
page.on("dialog", (d) => d.accept());
await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.fill('input[aria-label="Cari pohon"]', KODE2);
await page.waitForTimeout(400);
await page.click(`table tbody tr:has-text("${KODE2}") button:has-text("Hapus")`);
await page.waitForURL("**/admin/pohon?deleted=1", { timeout: 20000 });
ok("pohon berfoto terhapus", sql(`SELECT COUNT(*) FROM data_pohon WHERE idpohon='${KODE2}'`) === "0");
execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/upload/pohon/pohon_${KODE2}_*.jpg`);

// 6) cleanup: hapus pohon uji via UI
await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await page.fill('input[aria-label="Cari pohon"]', KODE);
await page.waitForTimeout(400);
await page.locator(`table tbody tr:has-text("${KODE}") button:has-text("Hapus")`).click();
await page.waitForURL("**/admin/pohon?deleted=1", { timeout: 20000 });
const sisa = sql(`SELECT COUNT(*) FROM data_pohon WHERE idpohon='${KODE}'`);
ok("pohon uji terhapus", sisa === "0");
execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/upload/pohon/pohon_${KODE}_*.jpg`);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
