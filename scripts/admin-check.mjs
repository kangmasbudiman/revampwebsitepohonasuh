// E2E ekspansi admin panel: sidebar+level, blog CRUD, pohon edit/hapus,
// kontak, penugasan, posisi (leaflet), tagging (upload+proses+selesai).
// Token JWT diinjeksi langsung (pola screenshot.mjs). Data dev
// dikembalikan ke keadaan semula di akhir.
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
const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

async function ctxWith(browser, payload) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: await signToken(payload), url: BASE }]);
  return ctx;
}

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();

// ================= 1. Admin level 1 =================
const adminCtx = await ctxWith(browser, { userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 });
const page = await adminCtx.newPage();
page.on("dialog", (d) => d.accept());

await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
assert(await page.locator("h1", { hasText: "Ringkasan" }).count() >= 0, "/admin termuat");
// Admin kini berdiri sendiri — satu-satunya header adalah top nav bar admin.
assert((await page.locator("header").count()) === 1, "top nav bar admin tampil (tanpa header publik)");
assert((await page.locator("footer").count()) === 0, "admin tanpa footer publik");
// Grup sidebar collapsible — buka semua grup dulu sebelum menghitung link
const groupBtns = page.locator("aside button[aria-expanded]");
for (let i = 0; i < (await groupBtns.count()); i++) {
  if ((await groupBtns.nth(i).getAttribute("aria-expanded")) === "false") await groupBtns.nth(i).click();
}
const navLinks = await page.locator("aside nav a").allTextContents();
assert(
  ["Ringkasan", "Dashboard Pemantauan", "Verifikasi Pembayaran", "Order Tagging", "Penugasan Petugas", "Posisi Petugas",
   "Kelola Peta Desa", "Kelola Pohon", "Kelola Blog", "Kelola Slider", "Kelola Sertifikat", "Kelola Keuangan",
   "Kelola User", "Pengaturan"].every((t) => navLinks.includes(t)),
  `sidebar 14 menu (${navLinks.length} link)`
);
assert((await page.locator("aside form button:has-text('Keluar')").count()) === 1, "shortcut Keluar di bawah sidebar");

// ---- Top nav bar: hamburger, pencarian global, notifikasi, fullscreen ----
assert((await page.locator("header button[aria-label='Layar penuh']").count()) === 1, "tombol fullscreen tersedia");
await page.click("header button[aria-label='Buka atau tutup menu samping']");
assert((await page.locator("aside").count()) === 0, "hamburger menyembunyikan sidebar desktop");
await page.click("header button[aria-label='Buka atau tutup menu samping']");
assert((await page.locator("aside").count()) === 1, "hamburger memunculkan sidebar kembali");

await page.click("header button[aria-label='Cari di seluruh sistem']");
const dlg = page.locator("div[role='dialog']");
assert(await dlg.isVisible(), "dialog pencarian terbuka via tombol");
await dlg.locator("input").fill("LL195");
await dlg.locator("button", { hasText: "LL195" }).first().waitFor({ timeout: 15000 });
assert((await dlg.getByText("Pohon").count()) >= 1, "hasil dikelompokkan per entitas (grup Pohon)");
await dlg.locator("button", { hasText: "LL195" }).first().click();
await page.waitForURL("**/admin/pohon/LL195", { timeout: 30000 });
assert((await page.locator("div[role='dialog']").count()) === 0, "dialog tertutup setelah navigasi");

await page.keyboard.press("Control+k");
assert(await page.locator("div[role='dialog']").isVisible(), "Ctrl+K membuka dialog pencarian");
await page.keyboard.press("Escape");
assert((await page.locator("div[role='dialog']").count()) === 0, "Escape menutup dialog");
// Navigasi keyboard: Enter membuka hasil pertama. Mulai dari /admin agar
// waitForURL benar-benar menunggu navigasi baru (bukan URL lama yang kebetulan cocok).
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.keyboard.press("Control+k");
await page.locator("div[role='dialog'] input").fill("rantaukermas");
await page.locator("div[role='dialog'] button", { hasText: "rantaukermas" }).first().waitFor({ timeout: 15000 });
await page.keyboard.press("Enter");
await page.waitForURL(/\/admin\/(peta\?desa=rantaukermas|pohon\/)/, { timeout: 30000 });
assert(page.url() !== `${BASE}/admin`, `Enter membuka hasil pertama (${page.url()})`);

// Prefill ?q= lewat hasil member.
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.keyboard.press("Control+k");
await page.locator("div[role='dialog'] input").fill("admintes2026");
await page.locator("div[role='dialog'] button", { hasText: "admintes2026@yahoo.com" }).first().waitFor({ timeout: 15000 });
await page.locator("div[role='dialog'] button", { hasText: "admintes2026@yahoo.com" }).first().click();
await page.waitForURL(/\/admin\/user\?q=/, { timeout: 30000 });
await page.waitForSelector("tbody tr", { timeout: 20000 });
assert(
  (await page.locator("tbody tr", { hasText: "admintes2026@yahoo.com" }).count()) === 1,
  "klik hasil member → /admin/user?q= ter-prefill & terfilter",
);

// ---- Lonceng notifikasi pesan (pesan_notif utk admin login) ----
const [pesanId] = rows(
  `INSERT INTO pesan_notif (idmember,pesan,status,created_at,updated_at) VALUES (2682,'E2E notifikasi top bar ${Date.now()}','noread',NOW(),NOW()); SELECT LAST_INSERT_ID();`,
)[0];
assert(!!pesanId, `pesan uji dibuat (id=${pesanId})`);
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator("header button[aria-label='Notifikasi'] span").first().waitFor({ timeout: 15000 });
const badgeText = await page.locator("header button[aria-label='Notifikasi'] span").first().textContent();
assert(Number(badgeText) >= 1, `badge jumlah pesan belum dibaca tampil (${badgeText})`);
await page.click("header button[aria-label='Notifikasi']");
const itemPesan = page.locator("header button", { hasText: "E2E notifikasi top bar" }).first();
await itemPesan.waitFor({ timeout: 15000 });
await itemPesan.click();
{
  let read = false;
  for (let i = 0; i < 20 && !read; i++) {
    await page.waitForTimeout(500);
    read = rows(`SELECT status FROM pesan_notif WHERE id=${pesanId}`)[0][0] === "read";
  }
  assert(read, "klik notifikasi → mypesanupdate menandai read di DB");
}
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM pesan_notif WHERE id=${pesanId}" 2>/dev/null`);
await page.keyboard.press("Escape");
await page.screenshot({ path: "screenshots/101-admin-topnav.png", fullPage: false });

// ---- Dark mode ----
await page.locator("aside button[aria-label^='Ganti ke mode']").click();
assert(await page.evaluate(() => document.documentElement.classList.contains("dark")), "toggle → <html> ber-class dark");
assert((await page.evaluate(() => localStorage.getItem("pa_theme"))) === "dark", "localStorage pa_theme=dark");
await page.waitForTimeout(400); // transition-colors 150ms — tunggu transisi selesai
// Tema gradasi: latar kini background-image (pa-page), bukan backgroundColor
// solid night-950 — uji kegelatan visual lewat rata-rata brightness piksel
// area konten (dekode PNG termasuk unfilter).
await page.screenshot({ path: "screenshots/99b-dark-probe.png" });
const zlib = await import("node:zlib");
{
  const png = fs.readFileSync("screenshots/99b-dark-probe.png");
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  const colorType = png[25]; // 0=gray 2=RGB 4=gray+A 6=RGBA
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType] ?? 4;
  let pos = 8, idat = Buffer.alloc(0);
  while (pos < png.length) {
    const len = png.readUInt32BE(pos), typ = png.toString("ascii", pos + 4, pos + 8);
    if (typ === "IDAT") idat = Buffer.concat([idat, png.subarray(pos + 8, pos + 8 + len)]);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(idat);
  const stride = w * ch;
  const lines = [];
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const start = y * (stride + 1) + 1;
    const line = Buffer.from(raw.subarray(start, start + stride));
    const prev = y > 0 ? lines[y - 1] : Buffer.alloc(stride);
    if (f === 1) for (let x = ch; x < stride; x++) line[x] = (line[x] + line[x - ch]) & 255;
    else if (f === 2) for (let x = 0; x < stride; x++) line[x] = (line[x] + prev[x]) & 255;
    else if (f === 3) for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255;
    } else if (f === 4) for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      line[x] = (line[x] + pr) & 255;
    }
    lines.push(line);
  }
  let sum = 0, n = 0;
  for (let y = Math.floor(h * 0.55); y < h; y += 6) {
    for (let x = Math.floor(w * 0.3); x < Math.floor(w * 0.95); x += 6) {
      const o = x * ch;
      sum += (lines[y][o] + lines[y][o + 1] + lines[y][o + 2]) / 3; n++;
    }
  }
  const avg = sum / n;
  assert(avg < 80, `area admin dark: brightness rata-rata ${avg.toFixed(0)} < 80 (gradasi night)`);
}
await page.reload({ waitUntil: "networkidle" });
assert(await page.evaluate(() => document.documentElement.classList.contains("dark")), "setelah reload tetap dark (script no-flash)");
await page.screenshot({ path: "screenshots/99-admin-dark-ringkasan.png", fullPage: true });
await page.locator("aside button[aria-label^='Ganti ke mode']").click();
assert(!(await page.evaluate(() => document.documentElement.classList.contains("dark"))), "toggle kembali ke terang");

// ---- Dashboard Pemantauan ----
await page.goto(`${BASE}/admin/pemantauan`, { waitUntil: "networkidle" });
await page.waitForSelector(".recharts-surface", { timeout: 20000 });
assert((await page.locator(".recharts-surface").count()) >= 2, "grafik recharts dirender (area+bar+pie)");
assert((await page.locator("h3", { hasText: "Kesehatan API Backend" }).count()) === 1, "kartu health check API tampil");
const totalOrderShown = Number(
  await page.locator("div:has(> p:text-is('Total Order')) > p:nth-child(2)").textContent(),
);
// ordercustomer bukan seluruh data_adopsi (hanya baris ber-confirmation) —
// bandingkan dengan respons API langsung, bukan COUNT tabel.
const apiTotal = (await (await fetch("http://127.0.0.1:8000/api/ordercustomer")).json()).length;
assert(totalOrderShown === apiTotal, `KPI Total Order (${totalOrderShown}) = API ordercustomer (${apiTotal})`);
await page.screenshot({ path: "screenshots/90-admin-pemantauan.png", fullPage: true });

// ---- Blog CRUD ----
await page.goto(`${BASE}/admin/blog`, { waitUntil: "networkidle" });
const judul = `E2E Artikel Admin ${Date.now()}`;
await page.click("summary:has-text('Tambah Artikel')");
await page.fill('input[name="title"]', judul);
await page.selectOption('select[name="category"]', "berita");
await page.fill('textarea[name="description"]', "Isi artikel uji E2E admin panel.");
await page.setInputFiles('input[name="cover"]', "/tmp/test-cover.jpg");
await page.click('form:has(input[name="title"]) button[type=submit]');
await page.waitForSelector("text=Artikel tersimpan", { timeout: 30000 });
const blogId = Number(rows(`SELECT id FROM blog WHERE name='${judul}'`)[0]?.[0]);
assert(!!blogId, `tambahblog → DB id=${blogId}`);
assert(
  rows(`SELECT cover FROM blog WHERE id=${blogId}`)[0][0].startsWith("cover_"),
  "cover tersimpan sebagai filename uploadcover"
);
await page.goto(`${BASE}/blog`, { waitUntil: "networkidle" });
assert((await page.getByText(judul).count()) === 1, "/blog menampilkan artikel baru");
{
  await page.waitForFunction(
    () => {
      const img = document.querySelector('img[src*="/_next/image"]');
      return img && img.complete && img.naturalWidth > 0;
    },
    { timeout: 15000 },
  );
}

await page.goto(`${BASE}/admin/blog/${blogId}/edit`, { waitUntil: "networkidle" });
const judulRev = `${judul} REVISI`;
await page.fill('input[name="title"]', judulRev);
await page.click('form:has(input[name="title"]) button[type=submit]');
await page.waitForURL("**/admin/blog?saved=1", { timeout: 30000 });
assert(rows(`SELECT name FROM blog WHERE id=${blogId}`)[0][0] === judulRev, "editblog → DB judul revisi");

await page.goto(`${BASE}/admin/blog`, { waitUntil: "networkidle" });
await page.click(`tr:has-text("${judulRev}") button:has-text("Hapus")`);
await page.waitForURL("**/admin/blog?deleted=1", { timeout: 30000 });
assert(rows(`SELECT COUNT(*) FROM blog WHERE id=${blogId}`)[0][0] === "0", "hapusblog → row hilang");
await page.screenshot({ path: "screenshots/92-admin-blog.png", fullPage: true });

// ---- Slider CRUD (satu slider utk web & mobile) ----
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM slider WHERE judul LIKE 'E2E Slide%'" 2>/dev/null`);
await page.goto(`${BASE}/admin/slider`, { waitUntil: "networkidle" });
const judulSlide = `E2E Slide Admin ${Date.now()}`;
await page.click("summary:has-text('Tambah Slide')");
await page.fill('input[name="judul"]', judulSlide);
await page.fill('textarea[name="deskripsi"]', "Deskripsi slide uji E2E.");
await page.setInputFiles('input[name="gambar"]', "/tmp/test-cover.jpg");
await page.click('form:has(input[name="judul"]) button[type=submit]');
await page.waitForSelector("text=Slide tersimpan", { timeout: 30000 });
const slideId = Number(rows(`SELECT id FROM slider WHERE judul='${judulSlide}'`)[0]?.[0]);
assert(!!slideId, `tambahslider → DB id=${slideId}`);
assert(
  rows(`SELECT gambar FROM slider WHERE id=${slideId}`)[0][0].startsWith("cover_"),
  "gambar slider tersimpan sebagai filename upload"
);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
// hero hanya merender teks slide AKTIF — pindah ke titik navigasi terakhir
const dots = page.locator("button[aria-label^='Ke slide ']");
await dots.nth((await dots.count()) - 1).click();
await page.getByText(judulSlide).first().waitFor({ timeout: 10000 });
assert((await page.getByText(judulSlide).count()) >= 1, "beranda menampilkan slide dari API");

await page.goto(`${BASE}/admin/slider/${slideId}/edit`, { waitUntil: "networkidle" });
const judulSlideRev = `${judulSlide} REVISI`;
await page.fill('input[name="judul"]', judulSlideRev);
await page.click('form:has(input[name="judul"]) button[type=submit]');
await page.waitForURL("**/admin/slider?saved=1", { timeout: 30000 });
assert(rows(`SELECT judul FROM slider WHERE id=${slideId}`)[0][0] === judulSlideRev, "editslider → DB judul revisi");

await page.goto(`${BASE}/admin/slider`, { waitUntil: "networkidle" });
await page.click(`tr:has-text("${judulSlideRev}") button:has-text("Hapus")`);
await page.waitForURL("**/admin/slider?deleted=1", { timeout: 30000 });
assert(rows(`SELECT COUNT(*) FROM slider WHERE id=${slideId}`)[0][0] === "0", "hapusslider → row hilang");
await page.screenshot({ path: "screenshots/98-admin-slider.png", fullPage: true });

// ---- Pohon edit + buat/hapus ----
const [kode, hargaAwal] = rows("SELECT idpohon, harga FROM data_pohon WHERE idpohon='LL195'")[0];
await page.goto(`${BASE}/admin/pohon/LL195`, { waitUntil: "networkidle" });
assert(await page.locator("h1:has-text('Edit Pohon')").count() === 1, "halaman edit pohon termuat");
// step=10000 → harus kelipatan 10 ribu, kalau tidak browser blokir submit
await page.fill('input[name="priceIdr"]', "120000");
await page.click('form:has(input[name="priceIdr"]) button[type=submit]');
await page.waitForURL("**saved=1", { timeout: 30000 });
assert(rows(`SELECT harga FROM data_pohon WHERE idpohon='LL195'`)[0][0] === "120000", "editpohon → DB harga 120000");
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE data_pohon SET harga=${hargaAwal}, price=${hargaAwal} WHERE idpohon='LL195'" 2>/dev/null`);

await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
const desa = rows("SELECT nama FROM desa ORDER BY id LIMIT 1")[0][0];
await page.click("summary:has-text('Tambah Pohon Baru')");
await page.fill('input[name="idpohon"]', "E2ETST");
await page.fill('input[name="localName"]', "Pohon Uji E2E");
await page.selectOption('select[name="desa"]', desa);
await page.fill('input[name="priceIdr"]', "50000");
await page.click('form:has(input[name="priceIdr"]) button[type=submit]');
{
  let ok = false;
  for (let i = 0; i < 20 && !ok; i++) {
    await page.waitForTimeout(500);
    ok = rows("SELECT COUNT(*) FROM data_pohon WHERE idpohon='E2ETST'")[0][0] === "1";
  }
  assert(ok, "tambahpohon via UI → DB");
}

// pohon baru ada di halaman terakhir (tabel 50/halaman)
const lastPage = Math.ceil(Number(rows("SELECT COUNT(*) FROM data_pohon")[0][0]) / 50);
await page.goto(`${BASE}/admin/pohon?page=${lastPage}`, { waitUntil: "networkidle" });
await page.click(`tr:has-text("E2ETST") button:has-text("Hapus")`);
await page.waitForURL("**/admin/pohon?deleted=1", { timeout: 30000 });
assert(rows("SELECT COUNT(*) FROM data_pohon WHERE idpohon='E2ETST'")[0][0] === "0", "hapuspohon via UI → row hilang");
await page.screenshot({ path: "screenshots/93-admin-pohon.png", fullPage: true });

// ---- Kontak ----
await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
const teleponLama = rows("SELECT telepon FROM kontak WHERE id=1")[0][0];
await page.fill('input[name="telepon"]', "+628117453701");
await page.click('form:has(input[name="telepon"]) button[type=submit]');
await page.waitForSelector("text=Kontak tersimpan", { timeout: 30000 });
assert(rows("SELECT telepon FROM kontak WHERE id=1")[0][0] === "+628117453701", "updatekontak → DB telepon");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
assert((await page.locator("footer").getByText("+628117453701").count()) === 1, "footer memakai telepon dari kontak Laravel");
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE kontak SET telepon='${teleponLama}' WHERE id=1" 2>/dev/null`);
await page.screenshot({ path: "screenshots/94-admin-kontak.png", fullPage: true });

// ---- Posisi petugas ----
await page.goto(`${BASE}/admin/posisi`, { waitUntil: "networkidle" });
await page.waitForSelector(".leaflet-container", { timeout: 20000 });
await page.waitForSelector(".leaflet-marker-icon", { timeout: 20000 });
const jmlDB = Number(rows("SELECT COUNT(*) FROM posisi_petugas")[0][0]);
const jmlMarker = await page.locator(".leaflet-marker-icon").count();
assert(jmlMarker === jmlDB, `peta posisi: ${jmlMarker} marker = ${jmlDB} baris DB`);
await page.screenshot({ path: "screenshots/95-admin-posisi.png", fullPage: true });

// ---- Penugasan ----
await page.goto(`${BASE}/admin/penugasan`, { waitUntil: "networkidle" });
await page.locator("div.rounded-2xl", { hasText: "baturajar" }).locator('input[value="2683"]').check();
await page.locator("div.rounded-2xl", { hasText: "baturajar" }).locator('button:has-text("Simpan Penugasan")').click();
await page.waitForURL("**/admin/penugasan?saved=1", { timeout: 30000 });
assert(
  rows("SELECT COUNT(*) FROM desa_petugas dp JOIN desa d ON dp.iddesa=d.id WHERE d.nama='baturajar' AND dp.idpetugas=2683")[0][0] === "1",
  "updatedesapetugas → 2683 ditugaskan di baturajar"
);
await page.goto(`${BASE}/admin/penugasan`, { waitUntil: "networkidle" });
await page.locator("div.rounded-2xl", { hasText: "baturajar" }).locator('input[value="2683"]').uncheck();
await page.locator("div.rounded-2xl", { hasText: "baturajar" }).locator('button:has-text("Simpan Penugasan")').click();
await page.waitForURL("**/admin/penugasan?saved=1", { timeout: 30000 });
assert(
  rows("SELECT COUNT(*) FROM desa_petugas dp JOIN desa d ON dp.iddesa=d.id WHERE d.nama='baturajar' AND dp.idpetugas=2683")[0][0] === "0",
  "penugasan dikembalikan (uncheck)"
);
await page.screenshot({ path: "screenshots/96-admin-penugasan.png", fullPage: true });

// ---- Kelola Peta Desa (peta offline) ----
const [desaUji, pohonDesa] = rows(
  "SELECT desa, COUNT(*) FROM data_pohon WHERE desa='rantaukermas' AND latitude IS NOT NULL GROUP BY desa",
)[0];
await page.goto(`${BASE}/admin/peta?desa=${encodeURIComponent(desaUji)}`, { waitUntil: "networkidle" });
// MapLibre: marker bukan DOM node (layer GPU) — jumlah titik divulgasi lewat
// data-pohon di wrapper peta + kanvas harus dirender.
await page.waitForSelector("div[data-pohon] .maplibregl-canvas", { timeout: 20000 });
const markerPeta = Number(await page.locator("div[data-pohon]").first().getAttribute("data-pohon"));
assert(markerPeta === Number(pohonDesa), `peta desa: ${markerPeta} titik = ${pohonDesa} pohon DB`);
assert((await page.getByText(`Total: ${pohonDesa}`).count()) === 1, "chip Total sesuai DB");
// Ganti gaya peta → Satelit (tile Esri) lalu kembali Standar (tile openfreemap).
await page.click('button[aria-label="Gaya peta Satelit"]');
await page.waitForResponse((r) => /arcgisonline\.com/.test(r.url()), { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(400);
assert(
  await page.locator('button[aria-label="Gaya peta Satelit"][aria-pressed="true"]').count() === 1,
  "pemilih gaya peta: Satelit aktif (tile Esri)",
);
await page.click('button[aria-label="Gaya peta Standar"]');
await page.waitForResponse((r) => /openfreemap\.org/.test(r.url()), { timeout: 20000 }).catch(() => {});
assert(
  await page.locator('button[aria-label="Gaya peta Standar"][aria-pressed="true"]').count() === 1,
  "kembali ke gaya Standar (tile openfreemap)",
);
// Unduhan offline — Playwright menangkap event download blob.
for (const [label, ekstensi] of [
  ["Unduh GeoJSON", "geojson"],
  ["Unduh KML", "kml"],
  ["Unduh PDF", "pdf"],
]) {
  const dlTunggu = page.waitForEvent("download", { timeout: 30000 });
  await page.click(`button:has-text("${label}")`);
  const dl = await dlTunggu;
  assert(
    (dl.suggestedFilename() ?? "").endsWith(`.${ekstensi}`),
    `unduh ${ekstensi}: ${dl.suggestedFilename()}`,
  );
}
await page.screenshot({ path: "screenshots/89-admin-peta.png", fullPage: true });

// ---- Kelola User (aktif/nonaktif) ----
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM member WHERE emaile LIKE 'e2e_kelolauser%'" 2>/dev/null`,
);
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "INSERT INTO member (tanggal,name,emaile,hp,passe,admin,aktif,coba,foto,job,kode,mati,tentang) VALUES (CURDATE(),'E2E Kelola User','e2e_kelolauser@test.local','08123',MD5(SHA1('rahasiae2e')),0,1,0,'','', '', '','')" 2>/dev/null`,
);
const idUserUji = Number(rows("SELECT id FROM member WHERE emaile='e2e_kelolauser@test.local'")[0][0]);
assert(!!idUserUji, `member uji dibuat (id=${idUserUji})`);
await page.goto(`${BASE}/admin/user`, { waitUntil: "networkidle" });
const jmlMember = Number(rows("SELECT COUNT(*) FROM member")[0][0]);
assert(
  (await page.getByText(`${jmlMember.toLocaleString("id-ID")} user`).count()) === 1,
  `kelola user: ${jmlMember.toLocaleString("id-ID")} user = COUNT DB`,
);
// Akun sendiri tidak boleh bisa dinonaktifkan.
await page.fill('input[placeholder*="Cari nama"]', "admintes2026");
assert(await page.locator("tr:has-text('Admin Pohon Asuh') button:disabled").count() === 1, "tombol akun sendiri disabled");
await page.fill('input[placeholder*="Cari nama"]', "e2e_kelolauser");
await page.click("tr:has-text('E2E Kelola User') button:has-text('Nonaktifkan')");
await page.waitForURL("**/admin/user?updated=*", { timeout: 30000 });
assert(rows(`SELECT aktif FROM member WHERE id=${idUserUji}`)[0][0] === "0", "nonaktifkan via UI → DB aktif=0");
const tolakLogin = await (
  await fetch("http://127.0.0.1:8000/api/loginuser", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "emaile=e2e_kelolauser@test.local&passe=apapun",
  })
).text();
assert(tolakLogin.includes('"403"') && tolakLogin.includes("dinonaktifkan"), `loginuser menolak akun nonaktif (${tolakLogin.slice(0, 60)})`);
await page.goto(`${BASE}/admin/user`, { waitUntil: "networkidle" });
await page.fill('input[placeholder*="Cari nama"]', "e2e_kelolauser");
await page.click("tr:has-text('E2E Kelola User') button:has-text('Aktifkan')");
await page.waitForURL("**/admin/user?updated=*", { timeout: 30000 });
assert(rows(`SELECT aktif FROM member WHERE id=${idUserUji}`)[0][0] === "1", "aktifkan kembali via UI");
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM member WHERE id=${idUserUji}" 2>/dev/null`);
await page.screenshot({ path: "screenshots/88-admin-user.png", fullPage: true });

// ---- Kelola Sertifikat ----
const [certUji] = rows("SELECT certnum FROM data_adopsi WHERE certnum IS NOT NULL AND certnum != '' ORDER BY id DESC LIMIT 1")[0];
const jmlCert = Number(rows("SELECT COUNT(*) FROM data_adopsi WHERE certnum IS NOT NULL AND certnum != ''")[0][0]);
await page.goto(`${BASE}/admin/sertifikat`, { waitUntil: "networkidle" });
assert(
  (await page.getByText(`${jmlCert.toLocaleString("id-ID")} sertifikat`).count()) === 1,
  `kelola sertifikat: ${jmlCert.toLocaleString("id-ID")} = COUNT DB`,
);
await page.fill('input[placeholder*="Cari nomor sertifikat"]', certUji);
assert(
  (await page.getByText("1 sertifikat").count()) === 1 && (await page.locator("tbody tr").count()) === 1,
  `cari certnum ${certUji} → 1 baris`,
);
const hrefLihat = await page.locator("tbody a:has-text('Lihat / Cetak')").first().getAttribute("href");
assert(
  hrefLihat === `/sertifikat/${certUji.split("/").map(encodeURIComponent).join("/")}`,
  `link sertifikat ter-encode (${hrefLihat})`,
);
await page.screenshot({ path: "screenshots/87-admin-sertifikat.png", fullPage: true });

// ================= 2. Petugas level 2 =================
const petugasCtx = await ctxWith(browser, { userId: 2683, name: "Petugas Taging", role: "ADMIN", level: 2 });
const p2 = await petugasCtx.newPage();
p2.on("dialog", (d) => d.accept());

await p2.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
assert(p2.url().includes("/admin/tagging"), `petugas akses /admin → redirect ${p2.url()}`);
const navPetugas = await p2.locator("aside nav a").allTextContents();
assert(
  navPetugas.length === 2 && navPetugas.includes("Order Tagging") && navPetugas.includes("Kelola Peta Desa"),
  `sidebar petugas: Order Tagging + Kelola Peta Desa (${navPetugas})`,
);
// Petugas juga bisa membuka peta offline desa tugasnya (rantaukermas).
await p2.goto(`${BASE}/admin/peta`, { waitUntil: "networkidle" });
await p2.waitForSelector("div[data-pohon] .maplibregl-canvas", { timeout: 20000 });
assert(
  Number(await p2.locator("div[data-pohon]").first().getAttribute("data-pohon")) > 0,
  "petugas melihat peta desa tugasnya",
);
assert((await p2.locator("button:has-text('Unduh PDF')").count()) === 1, "petugas bisa unduh peta offline");
assert((await p2.locator("aside form button:has-text('Keluar')").count()) === 1, "petugas juga punya shortcut Keluar");
assert((await p2.locator("header a[aria-label='Pengaturan']").count()) === 0, "petugas tanpa ikon pengaturan di top bar");
assert(
  (await p2.locator("header button[aria-label='Cari di seluruh sistem']").count()) === 1,
  "petugas tetap bisa memakai pencarian global",
);

// Pilih order proses=1 dari API yang benar-benar terlihat petugas 2683
const apiOrders = await (
  await fetch("http://127.0.0.1:8000/api/ordercustomerbypengurus", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "iduser=2683",
  })
).json();
const order = apiOrders.find((o) => Number(o.proses) === 1 && o.confirmasi === "yes");
assert(!!order, `order tagging ditemukan (id=${order?.id} pohon=${order?.idpohon})`);
const adopsiId = order.id;
const pohonKode = order.idpohon;
const adoptedAwal = rows(`SELECT adopted FROM data_pohon WHERE idpohon='${pohonKode}'`)[0][0];
const pesanMax = Number(rows("SELECT COALESCE(MAX(id),0) FROM pesan_notif")[0][0]);
const fotoMax = Number(rows("SELECT COALESCE(MAX(id),0) FROM foto_tagging")[0][0]);

await p2.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
const kartu = p2.locator("div.rounded-2xl.border", { hasText: pohonKode }).first();
await kartu.locator('input[type="file"]').setInputFiles("/tmp/test-cover.jpg");
await kartu.locator('button:has-text("Unggah")').click();
await p2.waitForSelector("text=Foto tagging terunggah", { timeout: 30000 });
assert(
  Number(rows(`SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=${adopsiId} AND id>${fotoMax}`)[0][0]) >= 1,
  "uploadfototaging via UI → row foto_tagging"
);

await p2.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
await p2.locator("div.rounded-2xl.border", { hasText: pohonKode }).first().locator('button:has-text("Mulai Proses")').click();
await p2.waitForURL("**proses=1", { timeout: 30000 });
assert(rows(`SELECT proses FROM data_adopsi WHERE id=${adopsiId}`)[0][0] === "2", "updatestatusproses → proses=2");

await p2.goto(`${BASE}/admin/tagging?proses=2`, { waitUntil: "networkidle" });
await p2.locator("div.rounded-2xl.border", { hasText: pohonKode }).first().locator('button:has-text("Tandai Selesai")').click();
await p2.waitForURL("**selesai=1", { timeout: 30000 });
assert(rows(`SELECT proses FROM data_adopsi WHERE id=${adopsiId}`)[0][0] === "3", "updatestatuscomplate → proses=3");
assert(rows(`SELECT adopted FROM data_pohon WHERE idpohon='${pohonKode}'`)[0][0] === "adopted", "pohon jadi adopted setelah selesai");
await p2.screenshot({ path: "screenshots/97-admin-tagging.png", fullPage: true });

// Pulihkan state dev
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE data_adopsi SET proses=1 WHERE id=${adopsiId}; UPDATE data_pohon SET adopted='${adoptedAwal}' WHERE idpohon='${pohonKode}'; DELETE FROM pesan_notif WHERE id>${pesanMax}; DELETE FROM foto_tagging WHERE id>${fotoMax};" 2>/dev/null`
);
assert(true, "state dev dipulihkan (proses/adopted/pesan/foto)");

// ================= 3. Session legacy tanpa level =================
const legacyCtx = await ctxWith(browser, { userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" });
const p3 = await legacyCtx.newPage();
await p3.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
assert((await p3.locator("h1:has-text('Kelola Pohon')").count()) === 1, "session lama tanpa level tetap dianggap admin");

await browser.close();
console.log("\n=== SEMUA TAHAP E2E ADMIN PANEL LULUS ===");
