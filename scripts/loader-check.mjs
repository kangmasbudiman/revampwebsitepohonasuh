// Verifikasi fallback loading: saat aktif, header tetap di atas, loader di
// tengah viewport, footer terdorong ke bawah fold (bukan memenuhi layar).
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();

for (const [label, vp] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 1500,
    downloadThroughput: 100 * 1024,
    uploadThroughput: 100 * 1024,
  });

  await page.goto(`${BASE}/faq`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Data Pohon" }).first().click();

  // Tunggu fallback benar-benar masuk DOM (bukan konten lama)
  await page.waitForSelector("text=Memuat data", { timeout: 15000 });
  await page.waitForTimeout(150); // beri waktu layout settle
  const m = await page.evaluate(() => {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const main = document.querySelector("main");
    const teks = [...document.querySelectorAll("p")].find((e) => e.textContent?.includes("Memuat data"));
    const hr = header?.getBoundingClientRect();
    const fr = footer?.getBoundingClientRect();
    const mr = main?.getBoundingClientRect();
    const tr = teks?.getBoundingClientRect();
    return {
      vh: window.innerHeight,
      headerBottom: hr?.bottom,
      footerTop: fr?.top,
      mainH: mr?.height,
      loaderY: tr ? Math.round((tr.top + tr.bottom) / 2) : null,
      scrollY: window.scrollY,
    };
  });
  console.log(`[${label}]`, JSON.stringify(m));
  await page.screenshot({ path: `/tmp/loader-fix-${label}.png` });

  const ok =
    m.headerBottom <= 80 &&
    m.mainH >= m.vh - 80 &&
    m.footerTop >= m.vh - 4 && // footer di/di bawah fold
    m.loaderY !== null &&
    m.loaderY > m.headerBottom &&
    m.loaderY < m.vh;
  console.log(`[${label}]`, ok ? "OK: header tampil, loader di tengah viewport, footer di bawah fold" : "GAGAL");
  await ctx.close();
}

await browser.close();
