// Smoke produksi: panel guest di detail pohon — tombol keranjang + Adopsi Sekarang
// (link login) + toggle hapus. Murni guest, tanpa auth; keranjang dibersihkan di akhir.
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Pohon available dinamis (pohon uji bisa berstatus kapan saja di prod)
await page.goto(`${BASE}/pohon`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const TREE = process.env.E2E_TREE
  ?? (await page.locator("a[href^='/pohon/']").first().getAttribute("href")).split("/").pop();

await page.goto(`${BASE}/pohon/${TREE}`, { waitUntil: "domcontentloaded" });

const add = page.locator('button:has-text("Tambah ke Keranjang")');
const adopt = page.locator(`a[href="/masuk?next=/pohon/${TREE}"]:has-text("Adopsi Sekarang")`);
await add.waitFor({ timeout: 20000 });
console.log("PASS — guest: tombol 'Tambah ke Keranjang' tampil di detail");
await adopt.waitFor({ timeout: 5000 });
console.log("PASS — guest: 'Adopsi Sekarang' = link /masuk?next=/pohon/" + TREE);

await add.click();
await page.waitForSelector('button:has-text("Hapus dari keranjang")', { timeout: 8000 });
console.log("PASS — guest: masuk keranjang → tombol toggle 'Hapus dari keranjang'");
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]', { timeout: 8000 });
console.log("PASS — guest: badge header 'Keranjang: 1 pohon'");

await page.locator('button:has-text("Hapus dari keranjang")').click();
await page.waitForSelector('a[aria-label="Keranjang"]', { timeout: 8000 });
console.log("PASS — guest: klik ulang = keluar keranjang (badge kosong)");
await page.waitForSelector('button:has-text("Tambah ke Keranjang")', { timeout: 8000 });
console.log("PASS — tombol balik ke 'Tambah ke Keranjang'");

// Layout mobile 390px: dua tombol berdampingan tanpa overflow.
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(`${BASE}/pohon/${TREE}`, { waitUntil: "domcontentloaded" });
const mAdd = m.locator('button:has-text("Tambah ke Keranjang")');
await mAdd.waitFor({ timeout: 20000 });
const bA = await mAdd.boundingBox();
const bB = await m.locator(`a[href="/masuk?next=/pohon/${TREE}"]:has-text("Adopsi Sekarang")`).boundingBox();
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (bA && bB && bB.x >= bA.x + bA.width - 1 && overflow <= 0) {
  console.log(`PASS — 390px: tombol berdampingan (add ${Math.round(bA.width)}px + adopt ${Math.round(bB.width)}px), overflow ${overflow}px`);
} else {
  console.error(`FAIL — 390px: add=${JSON.stringify(bA)} adopt=${JSON.stringify(bB)} overflow=${overflow}`);
  process.exit(1);
}

await browser.close();
console.log("\n=== SMOKE PROD PANEL GUEST LULUS ===");
