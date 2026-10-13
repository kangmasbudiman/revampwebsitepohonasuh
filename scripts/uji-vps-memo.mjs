// Smoke produksi pesan "Message and Impression" sertifikat (pohonasuh.io):
// fixture certnum 009/LPHD-RTK/2026 (order demo kraffdev 2679) — sign JWT
// pakai AUTH_SECRET prod, isi memo baru → assert tampil di lembar sertifikat
// + API 403 utk member lain; memo lama DIPULIHKAN di akhir.
// Jalankan dari repo web: node scripts/uji-vps-memo.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";

const BASE = "https://pohonasuh.io";
const API = "https://rest.pohonasuh.io/api";
const CERT = "009/LPHD-RTK/2026";
const USER = 2679; // kraffdev — pemilik fixture order demo 442

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("PASS —", msg);
};

const secret = new TextEncoder().encode(
  execSync(`ssh pohonasuh-vps "grep -oP 'AUTH_SECRET=\\K.*' /var/www/apps/pohonasuh/frontend/.env.production"`)
    .toString()
    .trim()
    .replace(/^"|"$/g, ""),
);
const MEMO_LAMA = "Demo kirim sertifikat hadiah";

const token = await new SignJWT({ userId: USER, name: "kraffdev", role: "USER" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

// ===== 1. Guest: form tak tampil =====
const browser = await chromium.launch();
const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await guest.goto(`${BASE}/sertifikat/${CERT}`, { waitUntil: "domcontentloaded" });
await guest.waitForSelector(".pa-sertifikat", { timeout: 20000 });
assert((await guest.locator('textarea[name="memo"]').count()) === 0, "guest: form memo TIDAK tampil");
await guest.close();

// ===== 2. Pemilik: isi & simpan =====
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/sertifikat/${CERT}`, { waitUntil: "domcontentloaded" });
const ta = page.locator('textarea[name="memo"]');
await ta.waitFor({ timeout: 20000 });
assert((await ta.inputValue()) === MEMO_LAMA, `form prefilled memo lama "${MEMO_LAMA}"`);
const MEMO_BARU = `Smoke memo prod ${Date.now()}`;
await ta.fill(MEMO_BARU);
await page.click('button:has-text("Simpan Pesan")');
await page.waitForSelector(`text=${MEMO_BARU}`, { timeout: 20000 });
assert(true, "memo baru tampil di lembar sertifikat (tanpa reload)");
const duplikat = await page.locator(".pa-sertifikat", { hasText: MEMO_BARU }).count();
assert(duplikat === 1, "memo tampil DI DALAM lembar sertifikat");

// ===== 3. API: non-pemilik ditolak =====
const tolak = await fetch(`${API}/updatememosertifikat`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `certnum=${encodeURIComponent(CERT)}&id=2682&memo=hack`,
}).then((r) => r.json());
assert(tolak.value === "403", `API menolak member lain (value=${tolak.value})`);

// ===== 4. Restore =====
await ta.fill(MEMO_LAMA);
await page.click('button:has-text("Simpan Pesan")');
await page.waitForSelector(`text=${MEMO_LAMA}`, { timeout: 20000 });
const cek = await fetch(`${API}/riwayatpohon`, { method: "POST" }).catch(() => null); // noop sanity
void cek;
assert(true, "cleanup: memo lama dipulihkan");
await ctx.clearCookies();
await browser.close();
console.log("\n=== SMOKE MEMO SERTIFIKAT PRODUKSI LULUS ===");
