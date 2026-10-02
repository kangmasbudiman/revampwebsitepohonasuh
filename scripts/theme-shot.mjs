// Screenshot tema admin baru: light + dark di halaman kunci.
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
for (const mode of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
  if (mode === "dark") await ctx.addInitScript(() => localStorage.setItem("pa_theme", "dark"));
  else await ctx.addInitScript(() => localStorage.setItem("pa_theme", "light"));
  const page = await ctx.newPage();
  for (const [name, path] of [
    ["ringkasan", "/admin"],
    ["pemantauan", "/admin/pemantauan"],
    ["pohon", "/admin/pohon"],
    ["verifikasi", "/admin/verifikasi"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/tmp/theme-${mode}-${name}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log("OK 8 screenshot /tmp/theme-{light,dark}-*.png");
