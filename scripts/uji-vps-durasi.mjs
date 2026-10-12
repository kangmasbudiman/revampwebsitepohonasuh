// Smoke produksi durasi adopsi (pohonasuh.io): login petugas → detail pohon
// TANPA stepper (masuk keranjang 1 tahun) → keranjang: stepper −/+/input,
// isi 12 → checkout tampil 12, + → 13, TANPA submit; bersih di akhir. Jalankan:
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
await page.goto(`${BASE}/masuk`, { waitUntil: "networkidle" });
await page.fill("#email", "petugastes2026@yahoo.com");
await page.fill("#password", "Petugas1234");
await page.click("button[type=submit]");
await page.waitForURL(/\/admin/, { timeout: 30000 });
assert(true, "login petugas");

// pohon available pertama
await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const card = page.locator("a[href^='/pohon/']").first();
const code = (await card.getAttribute("href")).split("/").pop();
assert(!!code, `pohon uji: ${code}`);

// detail: TANPA stepper (dihapus dari panel adopsi) — masuk keranjang 1 tahun
await page.goto(`${BASE}/pohon/${code}`, { waitUntil: "networkidle" });
assert(
  (await page.locator('input[aria-label="Durasi adopsi"]').count()) === 0,
  "detail pohon: tanpa stepper durasi (1 tahun default)",
);
await page.click('button:has-text("Tambah ke Keranjang")');
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]:visible', { timeout: 8000 });
assert(true, "pohon masuk keranjang (1 tahun)");

// keranjang: stepper −/+/input — isi 12, guard senyap 100
await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
const inCart = page.locator('input[aria-label^="Ubah durasi"]');
assert((await inCart.count()) === 1, "keranjang: input durasi tampil");
assert((await inCart.inputValue()) === "1", "nilai awal 1 tahun");
await page.click('button[aria-label^="Tambah durasi"]');
await page.waitForTimeout(200);
assert((await inCart.inputValue()) === "2", "tombol + → 2 tahun");
await page.click('button[aria-label^="Kurangi durasi"]');
await page.waitForTimeout(200);
assert((await inCart.inputValue()) === "1", "tombol − → 1 tahun");
await inCart.fill("250");
await page.waitForTimeout(300);
assert((await inCart.inputValue()) === "100", "guard senyap: isi 250 → dikunci 100");
await inCart.fill("12");
await page.waitForTimeout(300);
assert((await inCart.inputValue()) === "12", "isi 12 tahun lewat input (tanpa batas 5)");

// checkout: stepper ada, TANPA submit (jangan buat order di prod)
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
const inCo = page.locator('input[aria-label^="Ubah durasi"]');
assert((await inCo.count()) === 1, "checkout: input durasi tampil");
assert((await inCo.inputValue()) === "12", "checkout menunjukkan 12 tahun");
await page.click('button[aria-label^="Tambah durasi"]');
await page.waitForTimeout(200);
assert((await inCo.inputValue()) === "13", "tombol + di checkout → 13 tahun");

// cleanup: kosongkan keranjang + logout
await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
await page.click('button[aria-label^="Hapus"]');
await page.waitForSelector('a[aria-label="Keranjang"]:visible', { timeout: 8000 });
assert(true, "cleanup: keranjang kosong");
await ctx.clearCookies();

await browser.close();
console.log("\n=== SMOKE DURASI ADOPSI PRODUKSI LULUS ===");
