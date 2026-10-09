// Probe namaDesa(): chip /pohon + kartu lokasi + tabel admin harus Title Case,
// "KBKA" (input admin ber-kapital) tetap apa adanya.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const assert = (c, m) => { if (!c) { console.error("GAGAL:", m); process.exit(1); } console.log("OK", m); };

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""));
const tokenAdmin = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const browser = await chromium.launch();
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
  const chips = await page.locator("main a[href^='/pohon?lokasi=']").allTextContents();
  assert(chips.length >= 18, `${chips.length} chip lokasi tampil`);
  const lowercase = chips.filter((c) => /^[a-z]/.test(c.trim()));
  assert(lowercase.length === 0, `semua chip mulai huruf kapital (tanpa awal kecil): ${chips.slice(0, 5).join(", ")}…`);
  assert(chips.includes("KBKA"), 'chip input admin "KBKA" tetap kapital penuh');
  const kartu = await page.locator("main p:has-text('📍')").first().textContent().catch(() => null);
  assert(kartu && !/[📍]\s+[a-z]/.test(kartu), `kartu pohon 📍 kapital: ${kartu?.trim()}`);
  await page.screenshot({ path: "screenshots/desa-case-pohon.png" });
}
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
  const names = await page.locator("main h2").allTextContents();
  assert(names.length >= 18 && names.every((n) => /^[A-Z]/.test(n.trim())), `/lokasi semua judul kapital (${names[0]}, ${names[1]}…)`);
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: tokenAdmin, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
  await page.locator("tbody tr").first().waitFor({ timeout: 30000 });
  const opts = await page.locator("select[aria-label='Filter lokasi'] option").allTextContents();
  assert(opts.slice(1).every((o) => /^[A-Z]/.test(o.trim())), `dropdown Filter lokasi kapital: ${opts.slice(1, 4).join(", ")}`);
  assert(opts.includes("KBKA"), "dropdown tetap memuat KBKA apa adanya");
  const cell = await page.locator("tbody tr td").nth(2).textContent();
  assert(/^[A-Z]/.test(cell.trim()), `sel lokasi tabel admin kapital: ${cell.trim()}`);
  await page.goto(`${BASE}/admin/adopsi`, { waitUntil: "networkidle" });
  await page.locator("tbody tr").first().waitFor({ timeout: 30000 });
  const sub = await page.locator("tbody tr td p").nth(1).textContent();
  assert(/^[A-Z]/.test(sub.trim()), `tabel Data Adopsi lokasi kapital: ${sub.trim()}`);
  await ctx.close();
}
await browser.close();
console.log("=== PROBE NAMA DESA KAPITAL LULUS ===");
