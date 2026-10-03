// Screenshot popup notifikasi baru (NotifPopup): lonceng admin light+dark
// + lonceng member (situs publik, light-only — dark hanya utk /admin).
// Fixture pesan ber-tanggal beragam utk memperlihatkan waktu relatif.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim();

// bersihkan sisa run gagal dulu
rows(`DELETE FROM pesan_notif WHERE pesan LIKE 'E2E popup%'`);

const pesan = (idmember, teks, status, menitLalu) =>
  rows(
    `INSERT INTO pesan_notif (idmember,pesan,status,created_at) VALUES (${idmember},'${teks}','${status}',DATE_SUB(NOW(), INTERVAL ${menitLalu} MINUTE))`,
  );

const browser = await chromium.launch();
const shot = async (ctx, url, file) => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label="Notifikasi"]').first().click();
  await page.locator("div.animate-menu").waitFor({ timeout: 8000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: file });
  await page.close();
  console.log("OK", file);
};

// ===== Admin (2682) light + dark =====
pesan(2682, "E2E popup: Pembayaran adopsi #202610031970 terverifikasi — pohon A151 menunggu penandaan petugas.", "noread", 5);
pesan(2682, "E2E popup: Order baru menunggu verifikasi: invoice #202610031971 dari donatur Tes Logout Flow.", "noread", 190);
pesan(2682, "E2E popup: Sertifikat 004/LPHD-RTK/2026 telah terbit untuk adopsi pohon B004.", "read", 1600);

const adminToken = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

for (const mode of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (mode === "dark") await ctx.addInitScript(() => localStorage.setItem("pa_theme", "dark"));
  else await ctx.addInitScript(() => localStorage.setItem("pa_theme", "light"));
  await ctx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);
  await shot(ctx, "/admin", `/tmp/notif-popup-admin-${mode}.png`);
  await ctx.close();
}

// ===== Member (2681 akun QA) — header publik =====
pesan(2681, "E2E popup: Terima kasih! Adopsi pohon Anda di Rantau Kermas sedang diproses verifikasi.", "noread", 40);
pesan(2681, "E2E popup: Pohon B004 telah selesai ditandai petugas — sertifikat siap diunduh.", "read", 2900);

const memberToken = await new SignJWT({ userId: 2681, name: "Tes Logout Flow", role: "MEMBER" })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await mctx.addCookies([{ name: "pa_session", value: memberToken, url: BASE }]);
await shot(mctx, "/pohon", "/tmp/notif-popup-member.png");
await mctx.close();

rows(`DELETE FROM pesan_notif WHERE pesan LIKE 'E2E popup%'`);
await browser.close();
console.log("fixture dibersihkan");
