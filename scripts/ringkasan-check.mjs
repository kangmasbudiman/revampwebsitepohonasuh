// Verifikasi cepat: banner tahun-ini di /admin + judul testimoni beranda.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const assert = (c, m) => {
  if (!c) {
    console.error("✗ GAGAL:", m);
    process.exit(1);
  }
  console.log("✓", m);
};
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const signToken = (p) =>
  new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const browser = await chromium.launch();
const tahun = new Date().getFullYear();

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([
  { name: "pa_session", value: await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE },
]);
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
const main = await page.textContent("main");
assert(main.includes(`Adopsi Tahun ${tahun}`), `banner "Adopsi Tahun ${tahun}" tampil`);
assert(main.includes("15 pohon"), "jumlah pohon tahun ini (15) tampil");
assert(main.includes("2.810.000"), "dana tahun ini (Rp 2.810.000) tampil");
assert(main.includes("Total Dana Adopsi Terkumpul"), "banner total dana kumulatif tetap ada");
assert(main.includes("574.025.091"), "nilai total dana kumulatif tetap tampil");
await page.screenshot({ path: "screenshots/ringkasan-tahun-ini.png", fullPage: false });

const pub = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await pub.newPage();
await p2.goto(`${BASE}/`, { waitUntil: "networkidle" });
const homeId = await p2.textContent("body");
assert(homeId.includes("Cerita Pengadopsi"), "beranda ID: judul 'Cerita Pengadopsi'");
assert(!homeId.includes("Cerita para Pengasuh Pohon"), "beranda ID: judul lama hilang");

await pub.addCookies([{ name: "pa_lang", value: "en", url: BASE }]);
const p3 = await pub.newPage();
await p3.goto(`${BASE}/`, { waitUntil: "networkidle" });
const homeEn = await p3.textContent("body");
assert(homeEn.includes("Adopter Stories"), "beranda EN: 'Adopter Stories'");
assert(!homeEn.includes("Tree Fosterers"), "beranda EN: judul lama hilang");

await browser.close();
console.log("SELESAI");
