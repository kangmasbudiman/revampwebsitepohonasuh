// Screenshot lonceng admin (dropdown + tombol hapus + link lihat semua) & halaman notifikasi admin.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.locator('button[aria-label="Notifikasi"]').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/notif-admin-bell.png" });
await page.keyboard.press("Escape");
await page.goto(`${BASE}/dashboard/notifikasi`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/notif-admin-page.png" });
await browser.close();
console.log("OK /tmp/notif-admin-bell.png + /tmp/notif-admin-page.png");
