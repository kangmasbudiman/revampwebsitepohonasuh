// Smoke produksi durasi adopsi tanpa batas 5 tahun (pohonasuh.io): login
// petugas → detail pohon: input angka bebas (7), + / − jalan, guard senyap
// 100 (isi 250 → 100); masuk keranjang 12 tahun → ubah 20 di keranjang &
// checkout tanpa submit; bersih di akhir. Jalankan:
// node scripts/uji-vps-durasi.mjs
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("PASS —", msg);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// login petugas (akun QA)
await page.goto(`${BASE}/masuk`, { waitUntil: "domcontentloaded" });
await page.fill("#email", "petugastes2026@yahoo.com");
await page.fill("#password", "Petugas1234");
await page.click("button[type=submit]");
await page.waitForURL(/\/admin/, { timeout: 30000 });
assert(true, "login petugas");

// pohon available pertama
await page.goto(`${BASE}/pohon`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const card = page.locator("a[href^='/pohon/']").first();
const code = (await card.getAttribute("href")).split("/").pop();
assert(!!code, `pohon uji: ${code}`);

// detail: stepper tanpa batas
await page.goto(`${BASE}/pohon/${code}`, { waitUntil: "domcontentloaded" });
const inDur = page.locator('input[aria-label="Durasi adopsi"]');
assert((await inDur.count()) === 1, "detail pohon: input durasi tampil");
assert((await inDur.inputValue()) === "1", "nilai awal 1 tahun");

await inDur.fill("7");
await page.waitForTimeout(300);
const hint = await page.locator("p", { hasText: "/ tahun" }).first().textContent();
const harga = Number((hint.match(/Rp[\s  ]?[\d.]+/) || ["0"])[0].replace(/\D/g, ""));
assert((await inDur.inputValue()) === "7", "isi 7 tahun lewat input (tanpa batas 5)");
const panelTotal = await page.locator("form div.bg-emerald-50 span.font-bold").textContent();
assert(
  (panelTotal.match(/\d/g) || []).join("") === String(harga * 7),
  `total panel = ${harga}×7`,
);

await page.click('button[aria-label="Tambah durasi adopsi"]');
await page.waitForTimeout(200);
assert((await inDur.inputValue()) === "8", "tombol + → 8 tahun");
await page.click('button[aria-label="Kurangi durasi adopsi"]');
await page.waitForTimeout(200);
assert((await inDur.inputValue()) === "7", "tombol − → 7 tahun");

await inDur.fill("250");
await page.waitForTimeout(300);
assert((await inDur.inputValue()) === "100", "guard senyap: isi 250 → dikunci 100");

// masuk keranjang 12 tahun
await inDur.fill("12");
await page.waitForTimeout(200);
await page.click('button:has-text("Tambah ke Keranjang")');
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]:visible', { timeout: 8000 });
assert(true, "pohon 12 tahun masuk keranjang");

// keranjang: nilai 12, ubah ke 20
await page.goto(`${BASE}/keranjang`, { waitUntil: "domcontentloaded" });
const inCart = page.locator('input[aria-label^="Ubah durasi"]');
assert((await inCart.count()) === 1, "keranjang: input durasi tampil");
assert((await inCart.inputValue()) === "12", "keranjang mempertahankan 12 tahun");
await inCart.fill("20");
await page.waitForTimeout(300);
assert((await inCart.inputValue()) === "20", "ubah 20 tahun di keranjang");

// checkout: stepper ada, TANPA submit (jangan buat order di prod)
await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
const inCo = page.locator('input[aria-label^="Ubah durasi"]');
assert((await inCo.count()) === 1, "checkout: input durasi tampil");
assert((await inCo.inputValue()) === "20", "checkout menunjukkan 20 tahun");

// cleanup: kosongkan keranjang + logout
await page.goto(`${BASE}/keranjang`, { waitUntil: "domcontentloaded" });
await page.click('button[aria-label^="Hapus"]');
await page.waitForSelector('a[aria-label="Keranjang"]:visible', { timeout: 8000 });
assert(true, "cleanup: keranjang kosong");
await ctx.clearCookies();

await browser.close();
console.log("\n=== SMOKE DURASI ADOPSI TANPA BATAS PRODUKSI LULUS ===");
