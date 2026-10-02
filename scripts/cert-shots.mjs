// Screenshot halaman sertifikat baru (desktop + mobile) utk verifikasi visual.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const browser = await chromium.launch();
fs.mkdirSync("screenshots", { recursive: true });

const kasus = [
  ["web-order", "006%2FLPHD-RA%2F2026", 1440, 900], // memo kosong, rantaukermas
  ["multipohon", "220%2FKPHD-RK%2F2016", 1440, 900], // 4 pohon, fallback nama Park Jimin
  ["memo", "223%2FKPHD-RK%2F2016%20", 1440, 900], // memo terisi, fallback nama
  ["web-order-mobile", "006%2FLPHD-RA%2F2026", 390, 844],
];

for (const [nm, code, w, h] of kasus) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sertifikat/${code}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `screenshots/111-cert-${nm}.png`, fullPage: nm.includes("mobile") });
  await ctx.close();
  console.log("ok", nm);
}
await browser.close();
console.log("selesai");
