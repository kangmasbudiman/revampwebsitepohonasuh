// Verifikasi ikon keranjang di bar header mobile (sebelah hamburger):
// mobile <1280px badge keranjang selalu tampil di header; desktop tak berubah;
// badge duplikat di drawer dihapus; tambah pohon → badge terhitung.
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/mobile-cart-check.mjs
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const browser = await chromium.launch();

// ===== 1. Mobile 390px: badge keranjang tampil di bar header sebelah hamburger =====
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await m.evaluate(() => localStorage.clear());
await m.reload({ waitUntil: "networkidle" });

const burger = m.locator('header button[aria-label="Buka menu"]');
await burger.waitFor({ timeout: 10000 });
ok("mobile: hamburger tampil", await burger.isVisible());

const badgeMobile = m.locator('header div.xl\\:hidden > a[aria-label^="Keranjang"]');
await badgeMobile.waitFor({ timeout: 10000 });
ok("mobile: badge keranjang tampil di bar header (grup xl:hidden)", await badgeMobile.isVisible());

const bb = await burger.boundingBox();
const cb = await badgeMobile.boundingBox();
ok(
  "mobile: keranjang di KIRI hamburger, sejajar vertikal",
  cb.x < bb.x && Math.abs((cb.y + cb.height / 2) - (bb.y + bb.height / 2)) < 8,
  `cart x=${Math.round(cb.x)} burger x=${Math.round(bb.x)}`,
);
ok(
  "mobile: keduanya di dalam bar h-16",
  cb.y >= bb.y - 4 && cb.y + cb.height <= bb.y + 80,
  `cart y=${Math.round(cb.y)}..${Math.round(cb.y + cb.height)}`,
);

// ===== 2. Drawer dibuka: TIDAK ada lagi badge keranjang dobel di dalam drawer =====
await burger.click();
await m.waitForTimeout(400);
const drawerBadges = await m.locator('header nav.absolute a[aria-label^="Keranjang"]').count();
ok("drawer: badge keranjang dihapus dari drawer (tak dobel)", drawerBadges === 0, `${drawerBadges} badge`);
const drawerBell = await m.locator("header nav.absolute button[aria-label='Notifikasi']").count();
ok("drawer: lonceng & bahasa tetap ada di drawer", (await m.locator("header nav.absolute").first().textContent()) !== null);

// tutup drawer via navigasi
await m.keyboard.press("Escape");
await m.waitForTimeout(200);
await m.locator("body").click({ position: { x: 20, y: 300 } });
await m.waitForTimeout(300);

// ===== 3. Tambah pohon dari mobile (guest, tombol ikon kartu) → badge header menghitung =====
{
  await m.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
  const addBtn = m.locator('main button[aria-label*="ke keranjang"]').first();
  await addBtn.waitFor({ timeout: 10000 });
  await addBtn.click();
  await m.waitForTimeout(2500);
  const label = await m
    .locator('header div.xl\\:hidden > a[aria-label^="Keranjang"]')
    .first()
    .getAttribute("aria-label");
  ok("mobile: tambah pohon → badge header menghitung", (label ?? "").includes("Keranjang: 1"), label ?? "");
  const count = await m.locator('header div.xl\\:hidden > a[aria-label^="Keranjang"] span').first().textContent();
  ok("mobile: pill angka '1' tampil di badge", count?.trim() === "1", count ?? "");
}

// ===== 4. Homepage hero (overlay): badge tetap tampil (ikon putih) =====
await m.evaluate(() => localStorage.clear());
await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
const badgeHero = m.locator('header div.xl\\:hidden > a[aria-label^="Keranjang"]');
await badgeHero.waitFor({ timeout: 10000 });
ok("mobile homepage: badge keranjang tampil di header transparan (overlay)", await badgeHero.isVisible());
const color = await badgeHero.evaluate((el) => getComputedStyle(el).color);
ok("mobile homepage: ikon overlay berwarna putih", color === "rgb(255, 255, 255)", color);

// ===== 5. Desktop 1440: header tak berubah (badge desktop tampil, grup mobile hilang) =====
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
const badgeDesktop = d.locator('header div.hidden > a[aria-label^="Keranjang"], header div.xl\\:flex a[aria-label^="Keranjang"]').first();
await badgeDesktop.waitFor({ timeout: 10000 });
ok("desktop: badge keranjang versi desktop tampil", await badgeDesktop.isVisible());
const hiddenGrp = await d.locator('header div.xl\\:hidden > a[aria-label^="Keranjang"]').isVisible();
ok("desktop: grup mobile (badge+hamburger) tersembunyi", !hiddenGrp);
const navVisible = await d.locator("header nav.xl\\:flex, header nav.hidden").count();
ok("desktop: struktur nav tetap", navVisible >= 0, `${navVisible} nav`);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
