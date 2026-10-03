// Verifikasi desain popup notifikasi via DOM geometry (analyze_image error 1210).
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
    .toString().trim();

rows(`DELETE FROM pesan_notif WHERE pesan LIKE 'E2E popup%'`);

const assert = (cond, msg) => {
  if (!cond) { console.error("✗ GAGAL:", msg); process.exit(1); }
  console.log("✓", msg);
};

const pesan = (idmember, teks, status, menitLalu) =>
  rows(`INSERT INTO pesan_notif (idmember,pesan,status,created_at) VALUES (${idmember},'${teks}','${status}',DATE_SUB(NOW(), INTERVAL ${menitLalu} MINUTE))`);

const browser = await chromium.launch();

async function buka(token, url, dark) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // addInitScript men-serialize fungsi — closure tak ikut; wajib literal per cabang
  if (dark) await ctx.addInitScript(() => localStorage.setItem("pa_theme", "dark"));
  else await ctx.addInitScript(() => localStorage.setItem("pa_theme", "light"));
  await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label="Notifikasi"]').first().click();
  await page.locator("div.animate-menu").waitFor({ timeout: 8000 });
  await page.waitForTimeout(700);
  return { ctx, page };
}

// ===== Member (header publik) =====
pesan(2681, "E2E popup: Terima kasih! Adopsi pohon Anda di Rantau Kermas sedang diproses verifikasi.", "noread", 40);
pesan(2681, "E2E popup: Pohon B004 telah selesai ditandai petugas — sertifikat siap diunduh.", "read", 2900);
const memberToken = await new SignJWT({ userId: 2681, name: "Tes Logout Flow", role: "MEMBER" })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

{
  const { ctx, page } = await buka(memberToken, "/pohon", false);
  const geo = await page.evaluate(() => {
    const panel = document.querySelector("div.animate-menu");
    const r = panel.getBoundingClientRect();
    const bell = document.querySelector('button[aria-label="Notifikasi"]').getBoundingClientRect();
    const chip = panel.querySelector("header span, div:first-child span");
    const pill = [...panel.querySelectorAll("span")].find((s) => /^\d+$/.test(s.textContent?.trim()));
    const items = [...panel.querySelectorAll(".group\\/item")];
    const footer = panel.querySelector("a");
    const waktu = items.map((i) => i.querySelector("span.text-\\[11px\\]")?.textContent?.trim());
    const teks = items.map((i) => i.textContent ?? "");
    return {
      w: r.width, right: bell.right - r.right, leftInVw: r.left >= 0, top: r.top, bellBottom: bell.bottom,
      pill: pill?.textContent?.trim(),
      nItem: items.length,
      brdBaru: items.some((i) => i.className.includes("border-l-emerald-500")),
      brdRead: items.some((i) => i.className.includes("border-l-transparent")),
      waktuBaru: waktu[teks.findIndex((t) => t.includes("E2E popup: Terima kasih"))],
      waktuLama: waktu[teks.findIndex((t) => t.includes("E2E popup: Pohon B004"))],
      waktuSemua: waktu, footer: footer?.textContent?.trim(),
      scrollH: panel.scrollHeight, clientH: panel.clientHeight,
      round: panel.className.includes("rounded-2xl"),
    };
  });
  const unreadDb = rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=2681 AND status='noread'`);
  const totalDb = rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=2681`);
  assert(geo.w >= 350 && geo.w <= 390, `lebar panel ${geo.w}px (w-[22rem]/sm:w-96)`);
  assert(Math.abs(geo.right) <= 1, `panel sejajar kanan pembungkus lonceng (Δ ${geo.right}px)`);
  assert(geo.leftInVw, "panel tidak keluar viewport kiri");
  assert(geo.top >= geo.bellBottom, `panel di bawah lonceng (${geo.top} ≥ ${geo.bellBottom})`);
  assert(geo.pill === String(unreadDb), `pill unread merah = "${geo.pill}" (DB: ${unreadDb})`);
  assert(geo.nItem === Math.min(8, totalDb), `${geo.nItem} item tampil (DB: ${totalDb}, maks 8)`);
  assert(geo.brdBaru && geo.brdRead, "aksen kiri emerald (noread) vs transparan (read)");
  assert(/menit lalu/.test(geo.waktuBaru ?? ""), `waktu relatif fixture baru: "${geo.waktuBaru}"`);
  assert(/(hari lalu|Kemarin)/.test(geo.waktuLama ?? ""), `waktu relatif fixture lama: "${geo.waktuLama}"`);
  assert(geo.waktuSemua.every(Boolean), "semua item punya timestamp");
  assert(geo.footer === "Lihat semua notifikasi", "footer link benar");
  assert(geo.round, "panel rounded-2xl");
  // Escape menutup
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  assert((await page.locator("div.animate-menu").count()) === 0, "Escape menutup popup");
  await ctx.close();
}

// ===== Admin dark =====
pesan(2682, "E2E popup: Order baru menunggu verifikasi: invoice #202610031971.", "noread", 5);
pesan(2682, "E2E popup: Sertifikat 004/LPHD-RTK/2026 telah terbit.", "read", 190);
const adminToken = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

{
  const { ctx, page } = await buka(adminToken, "/admin", true);
  const cek = await page.evaluate(() => {
    const panel = document.querySelector("div.animate-menu");
    const bg = getComputedStyle(panel).backgroundColor;
    const itemBaru = panel.querySelector(".group\\/item");
    return { dark: document.documentElement.classList.contains("dark"), bg, hasDark: panel.className.includes("dark:bg-night-900") };
  });
  assert(cek.dark, "admin dalam mode dark");
  assert(cek.hasDark, "panel punya varian dark:bg-night-900");
  assert(/rgb\(\d{1,2}, \d{1,2}, \d{1,2}\)|rgb\(1\d, \d{1,2}, \d{1,2}\)/.test(cek.bg), `bg panel dark gelap (${cek.bg})`);
  assert((await page.locator("div.animate-menu").getByText("Notifikasi", { exact: true }).count()) >= 1, "judul header ada");
  assert((await page.locator('div.animate-menu button[aria-label="Tutup notifikasi"]').count()) === 1, "tombol tutup X ada");
  await ctx.close();
}

rows(`DELETE FROM pesan_notif WHERE pesan LIKE 'E2E popup%'`);
await browser.close();
console.log("\n=== VERIFIKASI DESAIN POPUP LULUS ===");
