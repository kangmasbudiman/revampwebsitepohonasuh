// Smoke produksi toggle keranjang (pohonasuh.io): klik ikon kartu → masuk
// keranjang (badge 1 + bingkai oranye); klik ulang → keluar (badge kosong,
// bingkai hilang); klik lagi → masuk kembali. Bersih di akhir (keranjang
// dikosongkan). Jalankan: node scripts/uji-vps-cart-toggle.mjs
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(800); // hidrasi React sebelum klik

const btn = page.locator("a[href^='/pohon/'] button[type=button]").first();
const card = page.locator("a[href^='/pohon/']").first();
const code = (await card.getAttribute("href")).split("/").pop();
assert(!!code, `kartu pohon tersedia utk uji: ${code}`);

// 1. Klik → masuk keranjang
await btn.click();
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]', { timeout: 8000 });
assert(
  (await card.locator("span.border-orange-400").count()) >= 1,
  "klik pertama: masuk keranjang (badge 1, bingkai oranye tampil)",
);
assert(page.url() === `${BASE}/pohon`, "klik tidak menavigasi");

// 2. Klik ulang → keluar keranjang (toggle off)
await btn.click();
await page.waitForSelector('a[aria-label="Keranjang"]', { timeout: 8000 });
assert(
  (await card.locator("span.border-orange-400").count()) === 0,
  "klik ulang: keluar keranjang (badge kosong, bingkai oranye hilang)",
);
assert(page.url() === `${BASE}/pohon`, "klik ulang tidak menavigasi");

// 3. Klik lagi → masuk kembali lalu bersihkan
await btn.click();
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]', { timeout: 8000 });
assert(true, "klik ketiga: masuk keranjang lagi (toggle dua arah)");
await btn.click();
await page.waitForSelector('a[aria-label="Keranjang"]', { timeout: 8000 });
assert(true, "cleanup: keranjang dikosongkan");

await browser.close();
console.log("\n=== SMOKE TOGGLE KERANJANG PRODUKSI LULUS ===");
