import { chromium } from "playwright";
import { SignJWT } from "jose";
const BASE = "https://pohonasuh.io";
const secret = new TextEncoder().encode((process.env.PA_PROD_AUTH_SECRET ?? "").replace(/^"|"$/g, ""));
const token = await new SignJWT({ userId: 2683, name: "P", role: "ADMIN", level: 2 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
console.log("URL:", page.url());
console.log("h1:", await page.locator("h1").allInnerTexts());
console.log("h2:", await page.locator("h2").allInnerTexts());
await browser.close();
