// Screenshot peta Kelola Peta Desa (maplibre): Standar + Satelit + popup.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const secret = new TextEncoder().encode(fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1]);
const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/admin/peta`, { waitUntil: "networkidle" });
await page.waitForSelector("div[data-pohon] .maplibregl-canvas", { timeout: 20000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/peta-standar.png" });
// klik spiral di sekitar pusat sampai kena marker (popup muncul)
const canvas = await page.locator(".maplibregl-canvas").boundingBox();
const cx = canvas.x + canvas.width / 2, cy = canvas.y + canvas.height / 2;
outer:
for (let r = 0; r <= 60; r += 12) {
  for (let a = 0; a < 12; a++) {
    const x = cx + r * Math.cos((a * Math.PI) / 6), y = cy + r * Math.sin((a * Math.PI) / 6);
    await page.mouse.click(x, y);
    await page.waitForTimeout(250);
    if ((await page.locator(".maplibregl-popup").count()) > 0) break outer;
  }
}
console.log("popup:", (await page.locator(".maplibregl-popup").count()) > 0);
await page.screenshot({ path: "/tmp/peta-popup.png" });
// satelit
await page.click('button[aria-label="Gaya peta Satelit"]');
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/peta-satelit.png" });
await browser.close();
console.log("OK /tmp/peta-{standar,popup,satelit}.png");
