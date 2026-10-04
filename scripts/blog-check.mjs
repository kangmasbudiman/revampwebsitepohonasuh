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

// ===== 7. Validasi ukuran upload admin (batas 2MB) =====
import fs from "node:fs";
import { SignJWT } from "jose";
execSync(`head -c 4194304 /dev/urandom > /tmp/upload-huge-4.jpg`);
execSync(`head -c 2621440 /dev/urandom > /tmp/upload-big-2_5.jpg`);
execSync(`head -c 1572864 /dev/urandom > /tmp/upload-ok-1_5.jpg`);

const secret = new TextEncoder().encode(fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1]);
const adminToken = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await adminCtx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);
const ap = await adminCtx.newPage();
ap.on("dialog", (d) => d.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await ap.addInitScript(() => {
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
await ap.goto(`${BASE}/admin/blog`, { waitUntil: "networkidle" });
await ap.click("summary:has-text('Tambah Artikel')");

// a) 4MB → kartu error inline custom + input dikosongkan + submit diblokir (client-side)
const judulBesar = `E2E Besar ${Date.now()}`;
await ap.fill('input[name="title"]', judulBesar);
await ap.selectOption('select[name="category"]', "berita");
await ap.fill('textarea[name="description"]', "tes ukuran");
await ap.setInputFiles('input[name="cover"]', "/tmp/upload-huge-4.jpg");
const val4mb = await ap.evaluate(() => {
  const i = document.querySelector('input[name="cover"]');
  return {
    error: !!document.querySelector("[data-testid=file-error]"),
    teks: document.querySelector("[data-testid=file-error]")?.textContent ?? "",
    files: i.files.length,
    native: i.validationMessage,
  };
});
assert(val4mb.error, "kartu error inline muncul untuk file 4MB");
assert(
  /terlalu besar/.test(val4mb.teks) && /4\.0 MB/.test(val4mb.teks),
  `kartu memuat judul + nama file + ukuran ("${val4mb.teks.replace(/\s+/g, " ").slice(0, 90)}")`,
);
assert(val4mb.files === 0, "file 4MB dikosongkan dari input (tak pernah terkirim ke server)");
assert(val4mb.native === "", "tanpa bubble validasi native (validationMessage kosong)");
await ap.screenshot({ path: "/tmp/file-input-error.png" });
await ap.click('form:has(input[name="title"]) button[type=submit]');
await ap.waitForTimeout(1500);
assert((await ap.locator("[data-testid=file-error]").count()) === 1, "submit saat error diblokir komponen (kartu tetap)");
assert(
  rows(`SELECT COUNT(*) FROM blog WHERE name='${judulBesar}'`)[0][0] === "0",
  "artikel ber-cover 4MB tidak tersimpan ke DB",
);

// b) 2,5MB → juga diblokir client-side (server 2MB kini cuma defense-in-depth)
await ap.setInputFiles('input[name="cover"]', "/tmp/upload-big-2_5.jpg");
const val2_5 = await ap.evaluate(() => ({
  error: !!document.querySelector("[data-testid=file-error]"),
  files: document.querySelector('input[name="cover"]').files.length,
}));
assert(val2_5.error && val2_5.files === 0, "file 2,5MB juga diblokir client-side (kartu error + input kosong)");

// c) 1,5MB → SUKSES + hint hijau (dulu mustahil: bodySizeLimit Server Action 1MB)
const judulSedang = `E2E Sedang ${Date.now()}`;
await ap.fill('input[name="title"]', judulSedang);
await ap.fill('textarea[name="description"]', "tes ukuran ok");
await ap.setInputFiles('input[name="cover"]', "/tmp/upload-ok-1_5.jpg");
const valOk = await ap.evaluate(() => ({
  hint: !!document.querySelector("[data-testid=file-ok]"),
  error: !!document.querySelector("[data-testid=file-error]"),
}));
assert(valOk.hint && !valOk.error, "file valid 1,5MB → hint hijau nama+ukuran, tanpa error");
await ap.click('form:has(input[name="title"]) button[type=submit]');
await ap.waitForSelector("text=Artikel tersimpan", { timeout: 30000 });
const [idSedang, coverSedang] = rows(`SELECT id, cover FROM blog WHERE name='${judulSedang}'`)[0];
const ukuranCover = fs.statSync(`/opt/homebrew/var/www/restApiPohonasuh/public/assets/${coverSedang}`).size;
assert(ukuranCover > 1500000, `cover 1,5MB tersimpan utuh di server (${(ukuranCover / 1048576).toFixed(1)}MB)`);

// bersihkan fixture (row + file cover)
await ap.click(`tr:has-text("${judulSedang}") button:has-text("Hapus")`);
await ap.waitForURL("**/admin/blog?deleted=1", { timeout: 30000 });
rows(`DELETE FROM blog WHERE id=${idSedang}`)[0];
execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/assets/${coverSedang} /tmp/upload-huge-4.jpg /tmp/upload-big-2_5.jpg /tmp/upload-ok-1_5.jpg`);
assert(true, "fixture dibersihkan (row + file cover)");
await adminCtx.close();

await browser.close();
console.log("\n=== SEMUA TAHAP E2E BLOG LULUS ===");
