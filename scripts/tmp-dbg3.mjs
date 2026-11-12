import { chromium } from "playwright";
import { SignJWT } from "jose";
const BASE = "https://pohonasuh.io";
const secret = new TextEncoder().encode((process.env.PA_PROD_AUTH_SECRET ?? "").replace(/^"|"$/g, ""));
const token = await new SignJWT({ userId: 1, name: "A", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
console.log("h2:", await page.locator("h2").allInnerTexts());
for (const r of await page.locator("tbody tr").allInnerTexts()) console.log("ROW:", r.replace(/\s+/g, " ").slice(0, 120));
await browser.close();
