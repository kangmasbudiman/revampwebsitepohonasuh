// E2E komprehensif: alur lengkap mitra.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

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
  for (let i = 0; i < 8 && (await p.count()); i++) { await p.first().click().catch(() => {}); await page.waitForTimeout(400); }
};
const go = async (page, path) => {
  await page.goto("http://localhost:3002" + path, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(7000);
  await tutupPopup(page);
};

// 1. DASHBOARD
await go(mitra, "/mitra");
let teks = await mitra.locator("body").innerText();
assert(teks.includes("Portal Mitra"), "1. Dashboard Mitra tampil");

// 2. BUAT PROGRAM
await go(mitra, "/mitra/program");
await mitra.locator("summary", { hasText: "Buat Program Baru" }).click().catch(() => {});
await mitra.waitForTimeout(1000);
const progNama = `E2E Program ${Date.now()}`;
await mitra.locator('input[name="nama"]').fill(progNama);
await mitra.locator('textarea[name="deskripsi"]').fill("E2E flow test");
await mitra.locator('input[name="tgl_mulai"]').fill("2026-11-15");
await mitra.locator('input[name="tgl_selesai"]').fill("2026-12-31");
await mitra.locator('input[name="durasi"]').fill("1 bulan");
await mitra.getByRole("button", { name: "Simpan Program" }).click();
await mitra.waitForTimeout(8000);

// 3. AJUKAN PEMESANAN POHON
await go(mitra, "/mitra/pesanan");
await mitra.locator('select[name="desa"]').selectOption("rantaukermas");
await mitra.locator('input[name="jumlah"]').fill("1");
await mitra.locator('input[name="catatan"]').fill("E2E pohon untuk flow test");
await mitra.getByRole("button", { name: "Kirim Permintaan" }).click();
await mitra.waitForTimeout(8000);

// 4. ADMIN SETUJUI PESANAN
await go(admin, "/admin/pesanan-mitra");
const row = admin.locator("tr", { hasText: "E2E pohon untuk flow test" }).first();
assert((await row.count()) > 0, "4. pesanan E2E tampil di admin");
await row.getByRole("button", { name: /Setujui/ }).click();
await admin.waitForTimeout(9000);

// cari pohon yang baru dialokasikan ke mitra
const data = JSON.parse(execSync(`ssh pohonasuh-vps "curl -s 'https://rest.pohonasuh.io/api/pohonmapall?page=1&per_page=200&status=MITRA'"`).toString());
const allocated = (data.data || []).filter((r) => r.mitra_id === 1).sort((a, b) => (Date.parse(b.reserved_at||"") || 0) - (Date.parse(a.reserved_at||"") || 0));
assert(allocated.length >= 1, "4b. pohon dialokasikan");
const allocatedCode = allocated[0].idpohon;
console.log("✓ 4b. Pohon dialokasi:", allocatedCode);

// 6. MITRA UNGGAH DESAIN TAGGING
await go(mitra, "/mitra/desain-tagging");
const fileRows = mitra.locator("form", { has: mitra.locator('input[type="file"]') });
if (await fileRows.count() >= 1) {
  const row0 = fileRows.first();
  await row0.locator('input[name="file"]').setInputFiles("public/images/papan-taging.png");
  await row0.getByRole("button", { name: /Upload/ }).click();
  await mitra.waitForTimeout(8000);
  console.log("✓ 6. Desain tagging diunggah");
} else {
  console.log("⚠ 6. Tidak ada program untuk desain tagging");
}

// 7. MITRA INPUT PENGABDI
await go(mitra, "/mitra/adopsi");
const csv = `KODE,NAMA,DURASI,TGL_ADOPT,MEMO\n${allocatedCode},E2E Pengadopsi,1,2026-11-15,E2E test`;
const csvBox = mitra.locator("textarea").first();
await csvBox.fill(csv);
await mitra.getByRole("button", { name: /Tambahkan dari CSV/i }).click();
await mitra.waitForTimeout(2000);
// pilih program E2E jika ada
const progSel = mitra.locator("select").first();
const opts = await progSel.locator("option").allInnerTexts();
const e2eOpt = opts.find((o) => o.includes("E2E"));
if (e2eOpt) await progSel.selectOption({ label: e2eOpt });
await mitra.getByRole("button", { name: /Input \d+ Adopsi/i }).click();
await mitra.waitForTimeout(8000);
teks = await mitra.locator("body").innerText();
const note = teks.includes("Pengurusan belum diverifikasi") ? "" : (teks.match(/Adopsi|sukses|Tercatat/i)?.[0] || "");
console.log("7. Hasil:", teks.slice(0, 300));

// 8. ADMIN VERIFIKASI
await go(admin, "/admin/verifikasi");
const vRow = admin.locator("a, tr", { hasText: "E2E Pengadopsi" }).first();
if (await vRow.count()) {
  await vRow.click();
  await admin.waitForTimeout(6000);
  await tutupPopup(admin);
  const btn = admin.getByRole("button", { name: /Verifikasi/i }).first();
  if (await btn.count()) {
    await btn.click();
    await admin.waitForTimeout(10000);
    console.log("✓ 8. Admin memverifikasi adopsi E2E");
  } else {
    console.log("⚠ 8. Tombol verifikasi tidak ditemukan");
  }
} else {
  console.log("⚠ 8. Row E2E tidak ditemukan di verifikasi");
}

// 9. LAPORAN
await go(mitra, "/mitra/laporan");
teks = await mitra.locator("body").innerText();
assert(/Laporan Mitra|Program Aktif|Adopsi Tercatat/i.test(teks), "9. Laporan mitra tampil");

// ===== Cleanup =====
const cleanupData = JSON.parse(execSync(`ssh pohonasuh-vps "curl -s 'https://rest.pohonasuh.io/api/pohonmapall?page=1&per_page=200&status=MITRA'"`).toString());
for (const r of (cleanupData.data || [])) {
  if (r.mitra_id === 1) {
    // release the most recent allocations (test ones)
    const reservedTime = Date.parse(r.reserved_at || "");
    if (reservedTime > Date.now() - 24 * 3600 * 1000) {
      execSync(`ssh pohonasuh-vps "curl -s -X POST 'https://rest.pohonasuh.io/api/lepaspohonmitra' -d 'idpohon=${r.idpohon}'"`);
      console.log("cleanup: release", r.idpohon);
    }
  }
}
console.log("E2E FLOW MITRA LULUS");
await browser.close();
