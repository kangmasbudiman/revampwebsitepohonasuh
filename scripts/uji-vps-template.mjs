// Smoke produksi template sertifikat (pohonasuh.io): uploadcover +
// tambahtemplate via fetch langsung ke rest.pohonasuh.io (TANPA utama —
// default prod tidak diganggu), halaman sertifikat ?tpl=<id> → latar
// berganti + tombol share tampil utk pemilik, lalu hapustemplate + rm
// file spesifik via ssh (nama file dari respons upload — tanpa glob,
// aturan insiden produksi 2026-10-11).
// Jalankan dari repo web: node scripts/uji-vps-template.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = "https://pohonasuh.io";
const API = "https://rest.pohonasuh.io/api";
const CERT = "009/LPHD-RTK/2026"; // fixture order demo kraffdev (pola uji-vps-memo)
const USER = 2679;
const NAMA = `Uji VPS Template ${Date.now()}`;

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("PASS —", msg);
};

if (!fs.existsSync("/tmp/uji-template.jpg")) {
  execSync(`sips -s format jpeg --resampleWidth 800 public/images/papan-taging.png --out /tmp/uji-template.jpg`);
}
const secret = new TextEncoder().encode(
  execSync(`ssh pohonasuh-vps "grep -oP 'AUTH_SECRET=\\K.*' /var/www/apps/pohonasuh/frontend/.env.production"`)
    .toString()
    .trim()
    .replace(/^"|"$/g, ""),
);
const token = await new SignJWT({ userId: USER, name: "kraffdev", role: "USER" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

// ===== 1. Upload + tambahtemplate via API =====
const fd = new FormData();
fd.append("image", new Blob([fs.readFileSync("/tmp/uji-template.jpg")], { type: "image/jpeg" }), "uji-template.jpg");
const up = await (await fetch(`${API}/uploadcover`, { method: "POST", body: fd })).json();
assert(Number(up.value) === 200 && !!up.cover, `uploadcover OK (${up.cover})`);
const FILE = up.cover;

const tambah = await (
  await fetch(`${API}/tambahtemplate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ nama: NAMA, file: FILE }),
  })
).json();
assert(Number(tambah.value) === 200 && !!tambah.id, `tambahtemplate OK (id=${tambah.id})`);
const TPL = tambah.id;

const list = await (await fetch(`${API}/templatelist`)).json();
const baris = Array.isArray(list) && list.find((r) => Number(r.id) === Number(TPL));
assert(!!baris && baris.file === FILE && Number(baris.utama) === 0, "templatelist memuat template baru (non-utama)");

// ===== 2. Guest: ?tpl → latar berganti; tanpa param → bg.png =====
const browser = await chromium.launch();
const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } });
async function latar(url) {
  await guest.goto(url, { waitUntil: "domcontentloaded" });
  await guest.waitForSelector(".pa-sertifikat img", { timeout: 20000 });
  await guest.waitForTimeout(500);
  return guest.locator(".pa-sertifikat img").first().getAttribute("src");
}
let src = await latar(`${BASE}/sertifikat/${CERT}?tpl=${TPL}`);
assert((src ?? "").includes(FILE), `?tpl=${TPL} → latar template upload`, (src ?? "").slice(0, 80));
src = await latar(`${BASE}/sertifikat/${CERT}`);
assert((src ?? "").includes("bg.png"), "tanpa param → tetap bg.png (default prod tak berubah)", (src ?? "").slice(0, 80));
assert((await guest.getByRole("heading", { name: "Bagikan Sertifikat" }).count()) === 0, "guest: picker TIDAK tampil");
await guest.close();

// ===== 3. Pemilik: picker + tombol share =====
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/sertifikat/${CERT}?tpl=${TPL}`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Bagikan Sertifikat" }).waitFor({ timeout: 20000 });
assert(true, "pemilik: picker tampil");
assert((await page.getByRole("button", { name: "Salin Tautan" }).count()) === 1, "tombol Salin Tautan tampil");
assert((await page.getByRole("button", { name: "Bagikan WhatsApp" }).count()) === 1, "tombol Bagikan WhatsApp tampil");
await ctx.close();
await browser.close();

// ===== 4. Hapus template + rm file spesifik =====
const hapus = await (
  await fetch(`${API}/hapustemplate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id: String(TPL) }),
  })
).json();
assert(Number(hapus.value) === 200, "hapustemplate OK");
const listAkhir = await (await fetch(`${API}/templatelist`)).json();
assert(!listAkhir.some((r) => Number(r.id) === Number(TPL)), "template hilang dari templatelist");

// Link lama otomatis fallback: ?tpl yang sudah dihapus → bg.png
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`${BASE}/sertifikat/${CERT}?tpl=${TPL}`, { waitUntil: "domcontentloaded" });
await p.waitForSelector(".pa-sertifikat img", { timeout: 20000 });
src = await p.locator(".pa-sertifikat img").first().getAttribute("src");
assert((src ?? "").includes("bg.png"), "link ?tpl lama setelah hapus → fallback bg.png", (src ?? "").slice(0, 80));
await b.close();

execSync(`ssh pohonasuh-vps "rm -f '/var/www/apps/pohonasuh/rest-api-pohonasuh/public/assets/${FILE}'"`);
assert(true, `cleanup: file upload dihapus spesifik (${FILE})`);

console.log("\n=== SMOKE TEMPLATE SERTIFIKAT PRODUKSI LULUS ===");
