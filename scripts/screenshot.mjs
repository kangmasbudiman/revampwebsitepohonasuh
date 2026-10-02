import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "screenshots";

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);

async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

async function autoScroll(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let y = 0;
        const step = () => {
          window.scrollBy(0, window.innerHeight * 0.8);
          y += window.innerHeight * 0.8;
          if (y < document.body.scrollHeight) setTimeout(step, 150);
          else resolve();
        };
        step();
      }),
  );
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function shot(page, url, name, { fullPage = true, scroll = fullPage } = {}) {
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  if (scroll) await autoScroll(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log("✓", name);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const anonCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
});

// Member asli di MySQL pohonasuh2: 2681 donatur (punya order), 2682 admin.
const donorToken = await signToken({ userId: 2681, name: "Tes Logout Flow", role: "DONOR" });
const adminToken = await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" });
const donorCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
});
await donorCtx.addCookies([{ name: "pa_session", value: donorToken, url: BASE }]);
const adminCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
});
await adminCtx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);

const mobileCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const anonPage = await anonCtx.newPage();
const donorPage = await donorCtx.newPage();
const adminPage = await adminCtx.newPage();
const mobilePage = await mobileCtx.newPage();

// Publik
await shot(anonPage, "/", "01-beranda-hero", { fullPage: false });
await shot(anonPage, "/", "02-beranda-lengkap");
await shot(anonPage, "/pohon", "03-data-pohon");
await shot(anonPage, "/pohon/A116", "04-detail-pohon");
await shot(anonPage, "/lokasi", "05-lokasi-hutan");
await shot(anonPage, "/lokasi/rantaukermas", "06-detail-lokasi");
await shot(anonPage, "/faq", "07-faq");
await shot(anonPage, "/keuangan", "08-laporan-keuangan");
await shot(anonPage, "/kontak", "09-kontak");
await shot(anonPage, "/masuk", "10-masuk");
await shot(anonPage, "/daftar", "11-daftar");
await shot(anonPage, "/sertifikat/001/LPHD-RA/2026", "12-sertifikat-adopsi");

// Donatur
await shot(donorPage, "/dashboard", "13-dashboard-donatur");
await shot(donorPage, "/dashboard/adopsi/363", "14-adopsi-menunggu-verifikasi");

// Admin
await shot(adminPage, "/admin", "16-admin-ringkasan");
await shot(adminPage, "/admin/verifikasi", "17-admin-verifikasi-daftar");
await shot(adminPage, "/admin/verifikasi/363", "18-admin-verifikasi-detail");
await shot(adminPage, "/admin/pohon", "19-admin-kelola-pohon");
await shot(adminPage, "/admin/keuangan", "20-admin-kelola-keuangan");

// Mobile
await shot(mobilePage, "/", "21-beranda-mobile", { fullPage: false });
await shot(mobilePage, "/pohon", "22-data-pohon-mobile", { fullPage: false });

await browser.close();
console.log(`\nSelesai: ${fs.readdirSync(OUT).length} screenshot tersimpan di ${OUT}/`);
