// Verifikasi visual navbar baru (dropdown Informasi + breakpoint xl). Sementara.
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const browser = await chromium.launch();

// 1. Desktop 1440 — overlay hero (beranda, belum scroll)
const d = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await d.goto(`${BASE}/`, { waitUntil: "networkidle" });
await d.screenshot({ path: "screenshots/120-nav-desktop-hero.png" });

// 2. Desktop 1440 — dropdown Informasi terbuka (hover)
await d.hover("nav button:has-text('Informasi')");
await d.waitForTimeout(400);
await d.screenshot({ path: "screenshots/121-nav-dropdown-open.png" });
const panelLinks = await d.locator("nav button:has-text('Informasi') + div a, nav .group a").allTextContents();
console.log("dropdown items:", panelLinks.filter((t) => ["FAQ", "Keuangan", "Kontak"].includes(t)));

// 3. Header putih di halaman dalam (/pohon) — cek jarak antar menu
await d.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await d.waitForTimeout(500);
await d.screenshot({ path: "screenshots/122-nav-desktop-putih.png" });

// Ukur lebar aktual nav vs container (bukti tidak dempet)
const metrics = await d.evaluate(() => {
  const nav = document.querySelector("header nav");
  const links = [...nav.querySelectorAll("a, button")].filter((e) => e.offsetParent);
  const gap = links.length > 1 ? links[1].getBoundingClientRect().left - links[0].getBoundingClientRect().right : 0;
  const widths = links.map((e) => Math.round(e.getBoundingClientRect().width));
  return { jml: links.length, gapPx: Math.round(gap * 10) / 10, widths, navW: Math.round(nav.getBoundingClientRect().width) };
});
console.log("desktop nav:", JSON.stringify(metrics));

// 4. 1100px — harus hamburger (nav desktop tersembunyi)
const t = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
await t.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
const hamburgerVisible = await t.locator("header button[aria-label='Buka menu']").isVisible();
const desktopNavHidden = await t.locator("header nav.hidden").count();
console.log("1100px: hamburger tampil =", hamburgerVisible, "| nav desktop hidden =", desktopNavHidden === 1);
await t.screenshot({ path: "screenshots/123-nav-1100.png" });

// 5. Mobile 390 — drawer dengan blok Informasi
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await m.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await m.click("header button[aria-label='Buka menu']");
await m.waitForTimeout(400);
const drawerItems = await m.locator("header nav a").allTextContents();
console.log("drawer items:", drawerItems);
await m.screenshot({ path: "screenshots/124-nav-drawer-mobile.png" });

await browser.close();
console.log("done");
