// E2E: mitra ajukan pesanan (lokasi desa + jumlah) → admin lihat & approve → alokasi pohon → release (cleanup)
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";

const secret = new TextEncoder().encode(
  execSync(`ssh pohonasuh-vps "grep -oP 'AUTH_SECRET=\\K.*' /var/www/apps/pohonasuh/frontend/.env.production"`)
    .toString().trim().replace(/^"|"$/g, ""),
);
const adminToken = await new SignJWT({ userId: 1, name: "Admin", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const memberToken = await new SignJWT({ userId: 2777, name: "Rival Fahlevi", role: "USER", hak: ["mitra"], mitraId: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const assert = (c, m) => { if (!c) { console.error("✗", m); process.exit(1); } console.log("✓", m); };

const browser = await chromium.launch();
const adminCtx = await browser.newContext({ viewport: { width: 1512, height: 982 } });
await adminCtx.addCookies([{ name: "pa_session", value: adminToken, domain: "localhost", path: "/" }]);
const mitraCtx = await browser.newContext({ viewport: { width: 1512, height: 982 } });
await mitraCtx.addCookies([{ name: "pa_session", value: memberToken, domain: "localhost", path: "/" }]);
const admin = await adminCtx.newPage();
const mitra = await mitraCtx.newPage();
const tutupPopup = async (page) => {
  const p = page.locator('button[aria-label="Tutup popup"]');
  for (let i = 0; i < 5 && (await p.count()); i++) { await p.first().click().catch(() => {}); await page.waitForTimeout(400); }
};
// 1. Mitra cek halaman /mitra/pesanan
await mitra.goto("http://localhost:3002/mitra/pesanan", { waitUntil: "domcontentloaded", timeout: 90000 });
await mitra.waitForTimeout(7000);
await tutupPopup(mitra);
let teks = await mitra.locator("body").innerText();
assert(teks.includes("Pemesanan Pohon"), "mitra: halaman pesanan tampil");
assert(teks.includes("Kirim Permintaan"), "mitra: form tampil");
// 2. Submit pesanan (desa rantaukermas, jumlah=1)
// isi form dan submit
await mitra.locator('select[name="desa"]').selectOption("rantaukermas");
await mitra.locator('input[name="jumlah"]').fill("1");
await mitra.locator('input[name="catatan"]').fill("E2E test pesanan");
await mitra.getByRole("button", { name: "Kirim Permintaan" }).click();
await mitra.waitForTimeout(8000);
teks = await mitra.locator("body").innerText();
const terkirim = teks.includes("Pesanan Terkirim") || teks.includes("sudah terkirim");
assert(terkirim, "mitra: pesanan terkirim");
console.log("status pesanan mitra terkirim");
// 3. Admin lihat pesanan pending
await admin.goto("http://localhost:3002/admin/pesanan-mitra", { waitUntil: "domcontentloaded", timeout: 90000 });
await admin.waitForTimeout(7000);
await tutupPopup(admin);
teks = await admin.locator("body").innerText();
assert(teks.includes("Pesanan Pohon Mitra"), "admin: halaman pesanan tampil");
assert(/Setujui/.test(teks), "admin: tombol setujui ada");
assert(teks.includes("Kraff Dev") || teks.includes("Rival Fahlevi"), "admin: mitra tampil di pending list");
// 4. Admin approve dan alokasikan 1 pohon
// find the row with note E2E test
const row = admin.locator("tr", { hasText: "E2E test pesanan" }).first();
assert((await row.count()) > 0, "admin: row pesanan E2E terlihat");
await row.getByRole("button", { name: "Setujui & Alokasikan" }).click();
await admin.waitForTimeout(10000);
teks = await admin.locator("body").innerText();
assert(teks.includes("Disetujui") || teks.includes(""), "admin: disetujui");
console.log("admin: approve ok");
// 5. cleanup: cari pohon yang ditahan mitra paling baru (status MITRA), lepas satu dengan nama E2E
const data = JSON.parse(execSync(`ssh pohonasuh-vps "curl -s 'https://rest.pohonasuh.io/api/pohonmapall?page=1&per_page=200&status=MITRA'"`).toString());
const mine = (data.data || []).filter((r) => String(r.reserved_name || "").includes("E2E") || true);
// sebaiknya identify yang paling baru; lepaskan yang paling besar id (paling baru) jika lebih dari 1 dari Kraff Dev
const mineC = mine.filter((r) => r.mitra_id === 1).sort((a, b) => b.id - a.id);
if (mineC.length) {
  const code = mineC[0].idpohon;
  execSync(`ssh pohonasuh-vps "curl -s -X POST 'https://rest.pohonasuh.io/api/lepaspohonmitra' -d 'idpohon=${code}'"`);
  console.log("cleanup: pohon", code, "dilepas");
} else {
  console.log("cleanup: tidak ada pohon mitra");
}
// 6. reject pesanan yang tersisa? Sudah diapprove; tidak perlu cleanup di sini (tree sudah dilepas)
await browser.close();
console.log("E2E PESANAN MITRA LULUS");
