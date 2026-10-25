// Uji pengaturan sosmed: form admin Pengaturan (input Instagram/Facebook/
// YouTube), simpan → footer menampilkan tautan; validasi URL; kosongkan
// YouTube → link YouTube hilang dari footer.
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/masuk?next=%2Fadmin`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click('button[type=submit]');
await page.waitForURL("**/admin", { timeout: 20000 });

await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });

// 1) tiga field sosmed tampil
for (const name of ["instagram", "facebook", "youtube"]) {
  ok(`field ${name} tampil`, (await page.locator(`input[name=${name}]`).count()) === 1);
}

// 2) validasi: URL tanpa skema ditolak validasi native type=url
await page.fill('input[name="instagram"]', "instagram.com/pohonasuh");
await page.click('button:has-text("Simpan Kontak")');
await page.waitForTimeout(500);
ok(
  "URL tanpa http:// dianggap invalid",
  (await page.locator('input[name="instagram"]:invalid').count()) === 1,
);
const dbSebelum = sql("SELECT instagram FROM kontak WHERE id=1");
ok("DB tak berubah saat invalid", dbSebelum !== "instagram.com/pohonasuh", dbSebelum);

// 3) simpan instagram+facebook, youtube kosong
await page.fill('input[name="instagram"]', "https://instagram.com/pohonasuh_e2e");
await page.fill('input[name="facebook"]', "https://facebook.com/pohonasuh_e2e");
await page.fill('input[name="youtube"]', "");
await page.click('button:has-text("Simpan Kontak")');
await page.waitForSelector("text=Kontak tersimpan", { timeout: 15000 });
ok("pesan tersimpan tampil", true);

// 4) DB: kolom tersimpan benar (youtube NULL)
const row = sql(
  "SELECT instagram, facebook, youtube IS NULL FROM kontak WHERE id=1",
).split("\t");
ok("DB instagram benar", row[0] === "https://instagram.com/pohonasuh_e2e", row[0]);
ok("DB facebook benar", row[1] === "https://facebook.com/pohonasuh_e2e", row[1]);
ok("DB youtube NULL", row[2] === "1", row[2]);

// 5) footer: Instagram & Facebook tampil dengan href benar, YouTube hilang
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const hrefIg = await page.locator('footer a:has-text("Instagram")').first().getAttribute("href");
const hrefFb = await page.locator('footer a:has-text("Facebook")').first().getAttribute("href");
ok("footer link Instagram", hrefIg === "https://instagram.com/pohonasuh_e2e", String(hrefIg));
ok("footer link Facebook", hrefFb === "https://facebook.com/pohonasuh_e2e", String(hrefFb));
ok("footer tanpa YouTube", (await page.locator('footer a:has-text("YouTube")').count()) === 0);

// 6) isi YouTube → muncul di footer
await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
await page.fill('input[name="youtube"]', "https://youtube.com/@pohonasuh_e2e");
await page.click('button:has-text("Simpan Kontak")');
await page.waitForSelector("text=Kontak tersimpan", { timeout: 15000 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const hrefYt = await page.locator('footer a:has-text("YouTube")').first().getAttribute("href");
ok("footer link YouTube setelah diisi", hrefYt === "https://youtube.com/@pohonasuh_e2e", String(hrefYt));

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
