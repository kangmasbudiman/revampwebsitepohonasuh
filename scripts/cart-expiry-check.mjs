// E2E kedaluwarsa keranjang: item lebih dari 1×24 jam otomatis keluar,
// pohon tetap tampil di daftar siap adopsi (tanpa tanda keranjang), dan
// banner pemberitahuan muncul di /keranjang sampai ditutup user.
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/cart-expiry-check.mjs
// Butuh server web + Laravel (untuk nama pohon di /pohon). DB hanya dibaca.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const DAY = 24 * 60 * 60 * 1000;

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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// ===== 1. Ambil pohon yang benar-benar tampil di /pohon =====
await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const shown = await page.$$eval('a[href^="/pohon/"]', (els) =>
  [...new Set(els.map((e) => e.getAttribute("href").split("/").pop()))].slice(0, 4),
);
if (shown.length < 3) throw new Error(`halaman /pohon hanya menampilkan ${shown.length} kartu`);
const [A, B, C] = shown;
const info = Object.fromEntries(
  rows(
    `SELECT idpohon, CONCAT(harga,'|',localname,'|',IFNULL(desa,'')) FROM data_pohon WHERE idpohon IN ('${A}','${B}','${C}')`,
  ).map((r) => [r[0], r[1].split("|")]),
);
const item = (code, addedAt) => ({
  code,
  localName: info[code][1],
  desa: info[code][2] || "-",
  priceIdr: Number(info[code][0]),
  photoUrl: null,
  years: 1,
  giftName: "",
  giftNote: "",
  ...(addedAt !== undefined ? { addedAt } : {}),
});

// ===== 2. Suntik keranjang: A kedaluwarsa (25 jam), B nyaris (23 jam) =====
await page.evaluate((items) => {
  localStorage.setItem("pa_cart_v1", JSON.stringify(items));
}, [item(A, Date.now() - 25 * 3600 * 1000), item(B, Date.now() - 23 * 3600 * 1000)]);

// ===== 3. /keranjang: A dibuang + banner, B selamat =====
await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Masa Simpan Keranjang Habis", { timeout: 8000 });
assert(true, "banner kedaluwarsa tampil di /keranjang");
await page.waitForSelector(`text=${B}`, { timeout: 5000 });
assert(true, `item ${B} (23 jam) masih di keranjang`);
const banner = page.locator("div.bg-amber-50");
assert(
  (await banner.locator(`text=${info[A][1]}`).count()) === 1,
  `banner menyebut pohon kedaluwarsa ${A} (${info[A][1]})`,
);
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]', { timeout: 5000 });
assert(true, "badge header hanya menghitung 1 pohon (A keluar otomatis)");
const codes = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("pa_cart_v1") || "[]").map((i) => i.code),
);
assert(JSON.stringify(codes) === JSON.stringify([B]), `localStorage tersisa hanya [${B}]`);

// ===== 4. /pohon: A tampil lagi tanpa tanda, B masih bertanda =====
await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const cardA = page.locator(`a[href="/pohon/${A}"]`);
const cardB = page.locator(`a[href="/pohon/${B}"]`);
assert((await cardA.count()) === 1, `pohon ${A} tetap tampil di daftar siap diadopsi`);
assert((await cardA.locator("span.border-orange-400").count()) === 0, `kartu ${A} tanpa bingkai oranye`);
assert((await cardA.locator("text=Di Keranjang").count()) === 0, `kartu ${A} tanpa badge "Di Keranjang"`);
assert((await cardB.locator("span.border-orange-400").count()) === 1, `kartu ${B} masih berbingkai oranye`);

// ===== 5. Tutup banner → tak muncul lagi =====
await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
await page.click('button[aria-label="Tutup pemberitahuan masa simpan keranjang"]');
await page.waitForSelector("text=Masa Simpan Keranjang Habis", { state: "detached", timeout: 5000 });
assert(true, "banner tertutup via tombol X");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
assert(
  (await page.locator("text=Masa Simpan Keranjang Habis").count()) === 0,
  "banner tak muncul lagi setelah ditutup (reload)",
);

// ===== 6. Ubah durasi tidak me-reset masa simpan =====
const stampSebelum = await page.evaluate(
  (code) => JSON.parse(localStorage.getItem("pa_cart_v1")).find((i) => i.code === code).addedAt,
  B,
);
await page.click('button[aria-label^="Tambah durasi"]');
await page.waitForTimeout(300);
const stampSesudah = await page.evaluate(
  (code) => JSON.parse(localStorage.getItem("pa_cart_v1")).find((i) => i.code === code).addedAt,
  B,
);
assert(
  stampSesudah === stampSebelum && typeof stampSesudah === "number",
  "stempel addedAt terpelihara saat ubah durasi",
);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(`text=${B}`, { timeout: 5000 });
assert(true, `${B} bertahan setelah reload (addedAt tak ter-reset)`);

// ===== 7. Item lama tanpa addedAt dimigrasi (dianggap baru), bukan dibuang =====
await page.evaluate(
  (items) => localStorage.setItem("pa_cart_v1", JSON.stringify(items)),
  [item(B, Date.now() - 23 * 3600 * 1000), item(C)],
);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(`text=${C}`, { timeout: 5000 });
assert(true, `item lama tanpa stempel (${C}) tetap hidup (migrasi)`);
const stamped = await page.evaluate(
  (code) => JSON.parse(localStorage.getItem("pa_cart_v1")).find((i) => i.code === code).addedAt,
  C,
);
assert(typeof stamped === "number", "item migrasi mendapat stempel addedAt");

// ===== 8. Kedaluwarsa tercatat ulang bila terjadi lagi =====
await page.evaluate(
  (items) => localStorage.setItem("pa_cart_v1", JSON.stringify(items)),
  [item(A, Date.now() - 25 * 3600 * 1000), item(B, Date.now() - 23 * 3600 * 1000)],
);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("text=Masa Simpan Keranjang Habis", { timeout: 8000 });
assert(true, "banner muncul lagi untuk kejadian kedaluwarsa baru");

// ===== 9. Tambah via UI tetap normal (diberi stempel segar) =====
await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.locator(`a[href="/pohon/${C}"] button[type=button]`).click();
await page.waitForTimeout(300);
await page.waitForSelector('a[aria-label="Keranjang: 2 pohon"]', { timeout: 5000 });
const fresh = await page.evaluate(
  (code) => JSON.parse(localStorage.getItem("pa_cart_v1")).find((i) => i.code === code).addedAt,
  C,
);
assert(Date.now() - fresh < 60 * 1000, `tambah via UI diberi stempel segar (${C})`);

// Keranjang = localStorage browser konteks tes — hancur bersama browser, tanpa cleanup DB.
await browser.close();
console.log("\n=== SEMUA TAHAP E2E KEDALUWARSA KERANJANG LULUS ===");
