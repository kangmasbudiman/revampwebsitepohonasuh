// E2E fitur blog web: list + filter kategori + detail + increment viewer
// (addviewer) + nav header + section homepage. Viewer DB dibaca sebelum/
// sesudah detail untuk membuktikan addviewer jalan.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";
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

// Urutan artikel (id desc): 3 (berita, TERBARU), 2 & 1 (artikel)
const byId = Object.fromEntries(rows("SELECT id, name, kategori, viewer FROM blog").map((r) => [r[0], r]));
assert(Object.keys(byId).length >= 3, `blog di DB: ${Object.keys(byId).length} artikel`);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

// ===== 1. Header memuat menu Blog =====
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
assert(await page.locator('header nav a:has-text("Blog")').count() === 1, 'nav header ada "Blog"');

// ===== 2. Homepage: section Artikel Terbaru =====
await page.waitForSelector("text=Artikel Terbaru", { timeout: 15000 });
const kartuHome = await page.locator('a[href^="/blog/"]').count();
assert(kartuHome >= 3, `homepage menampilkan ${kartuHome} kartu artikel`);

// ===== 3. /blog: featured TERBARU + sisanya =====
await page.click('header nav a:has-text("Blog")');
await page.waitForURL(`${BASE}/blog`);
await page.waitForSelector(`text=${byId[3][1]}`, { timeout: 15000 });
assert((await page.getByText("Terbaru", { exact: true }).count()) === 1, "kartu featured berbadge Terbaru");
assert((await page.locator('a[href^="/blog/"]').count()) === 3, "semua 3 artikel tampil");
fs_check: {
  await page.waitForSelector(`text=${byId[2][1]}`, { timeout: 5000 });
  await page.waitForSelector(`text=${byId[1][1]}`, { timeout: 5000 });
  assert(true, `kartu lain: "${byId[2][1]}" & "${byId[1][1]}" tampil`);
}

// Cover image benar-benar termuat lewat optimizer (bukan broken image)
{
  await page.waitForFunction(
    () => {
      const img = document.querySelector('img[src*="/_next/image"]');
      return img && img.complete && img.naturalWidth > 0;
    },
    { timeout: 15000 },
  );
  assert(true, "cover image /blog termuat (naturalWidth > 0)");
}
await page.screenshot({ path: "screenshots/90-blog-list.png", fullPage: true });

// ===== 4. Filter kategori =====
// Selektor per href (bukan has-text): label nav "Blog & Artikel" juga
// cocok substring "Artikel" dan berada lebih dulu di DOM.
await page.click('main a[href="/blog?kategori=berita"]');
await page.waitForURL("**/blog?kategori=berita");
await page.waitForSelector(`text=${byId[3][1]}`, { timeout: 15000 });
await page.waitForTimeout(300);
const tampilBerita = await page.locator('a[href^="/blog/"]').count();
assert(tampilBerita === 1, `filter Berita → 1 artikel (${tampilBerita})`);

await page.click('main a[href="/blog?kategori=artikel"]');
await page.waitForURL("**/blog?kategori=artikel");
await page.waitForTimeout(500);
const tampilArtikel = await page.locator('a[href^="/blog/"]').count();
assert(tampilArtikel === 2, `filter Artikel → 2 artikel (${tampilArtikel})`);

await page.locator('main a[href="/blog"]').first().click();
await page.waitForURL(`${BASE}/blog`);
await page.waitForTimeout(500);
assert((await page.locator('a[href^="/blog/"]').count()) === 3, "chip Semua → 3 artikel");

// ===== 5. Detail + addviewer =====
const viewerSebelum = Number(byId[3][3]);
await page.click(`a[href="/blog/3"]`);
await page.waitForURL(`${BASE}/blog/3`);
await page.waitForSelector(`text=${byId[3][1]}`, { timeout: 15000 });
await page.waitForSelector(`text=kali dibaca`, { timeout: 5000 });
const teksViewer = await page.locator("text=kali dibaca").first().textContent();
assert(
  teksViewer.includes(String(viewerSebelum + 1)),
  `detail menampilkan ${viewerSebelum + 1} kali dibaca (DB sebelum: ${viewerSebelum})`,
);
const viewerSesudah = Number(rows("SELECT viewer FROM blog WHERE id=3")[0][0]);
assert(viewerSesudah === viewerSebelum + 1, `DB viewer naik: ${viewerSebelum} → ${viewerSesudah}`);
await page.waitForSelector("text=Artikel Lainnya", { timeout: 5000 });
assert(true, "section Artikel Lainnya tampil");
{
  await page.waitForFunction(
    () => {
      const img = document.querySelector('article img[src*="/_next/image"]');
      return img && img.complete && img.naturalWidth > 0;
    },
    { timeout: 15000 },
  );
  assert(true, "cover image detail termuat (naturalWidth > 0)");
}
await page.screenshot({ path: "screenshots/91-blog-detail.png", fullPage: true });

// ===== 6. 404 =====
// Status HTTP tetap 200 karena shell sudah ke-stream sebelum notFound()
// (perilaku bawaan Next, sama seperti /pohon/[code]) — cek UI-nya.
await page.goto(`${BASE}/blog/999`);
const judul404 = await page.title();
assert(judul404.includes("tidak ditemukan"), `/blog/999 menampilkan halaman tidak ditemukan (${judul404})`);

await browser.close();
console.log("\n=== SEMUA TAHAP E2E BLOG LULUS ===");
