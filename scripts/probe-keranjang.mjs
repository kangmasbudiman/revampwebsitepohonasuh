// Probe layout mobile /keranjang + /checkout (fix responsive 2026-10-10).
// Seed localStorage pa_cart_v1, ukur geometri kartu item di 390px + 1440px,
// plus audit scrollWidth halaman (deteksi overflow horizontal page).
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const CART = [
  { code: "D095", localName: "Kayu Meran", desa: "Rantau Kermas", priceIdr: 200000, photoUrl: null, years: 1, addedAt: Date.now() },
  { code: "A151", localName: "Kayu Nulad Lithocarpus palembanica", desa: "Sarabun", priceIdr: 200000, photoUrl: null, years: 3, giftName: "Budi", giftNote: "selamat", addedAt: Date.now() },
];

const ukur = async (page) =>
  page.evaluate(() => {
    const kartu = [...document.querySelectorAll("div.border-l-4")].filter((d) =>
      d.className.includes("border-l-orange-400"),
    );
    const out = {
      vw: innerWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      kartu: [],
    };
    for (const k of kartu.slice(0, 2)) {
      const img = k.querySelector(".overflow-hidden.rounded-xl");
      const badge = k.querySelector("span.bg-orange-500.rounded-full");
      const nama = k.querySelector("a[href^='/pohon/']");
      const stepper = [...k.querySelectorAll("button")].find((b) => b.getAttribute("aria-label")?.startsWith("Kurangi"))?.closest("div.inline-flex");
      const subtotal = [...k.querySelectorAll("span.font-bold")].find((s) => /^Rp[\s  ]?\d/.test(s.textContent ?? ""));
      const trash = [...k.querySelectorAll("button")].find((b) => b.getAttribute("aria-label")?.startsWith("Hapus"));
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) };
      };
      out.kartu.push({
        kartu: r(k),
        img: r(img),
        badge: r(badge),
        badgeDiDalamOverflow: badge?.closest(".overflow-hidden") === img,
        badgeKeluarKartu: badge && k ? badge.getBoundingClientRect().left < k.getBoundingClientRect().left - 1 : null,
        namaLebar: nama ? r(nama).w : null,
        stepper: r(stepper),
        subtotal: r(subtotal),
        subtotalSebarisStepper: subtotal && stepper ? Math.abs(subtotal.getBoundingClientRect().top - stepper.getBoundingClientRect().top) < 40 : null,
        trash: r(trash),
        trashTerlihat: trash ? trash.getBoundingClientRect().right <= innerWidth : null,
      });
    }
    return out;
  });

const ukurCheckout = (page) =>
  page.evaluate(() => {
    const baris = document.querySelector("form .flex.items-center, form .flex.flex-wrap.items-center");
    const nama = baris?.querySelector("p.truncate");
    const subtotal = [...(baris?.querySelectorAll("span.font-bold") ?? [])].find((s) => /^Rp[\s  ]?\d/.test(s.textContent ?? ""));
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), right: Math.round(b.right) };
    };
    return {
      url: location.pathname,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      namaLebar: nama ? r(nama).w : null,
      subtotal: r(subtotal),
      subtotalRight: subtotal ? subtotal.getBoundingClientRect().right <= innerWidth : null,
    };
  });

const elemenOverflow = (page) =>
  page.evaluate(() => {
    const vw = innerWidth;
    const jelek = [];
    for (const el of document.querySelectorAll("*")) {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && (b.right > vw + 1 || b.left < -1)) {
        jelek.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 90),
          left: Math.round(b.left),
          right: Math.round(b.right),
          w: Math.round(b.width),
        });
        if (jelek.length >= 8) break;
      }
    }
    return jelek;
  });

const auditPage = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
  const ov = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    title: document.title.slice(0, 40),
  }));
  console.log(
    `  ${ov.sw > ov.cw + 1 ? "OVERFLOW" : "ok      "} ${path.padEnd(22)} scrollW=${ov.sw} viewport=${ov.cw}`,
  );
};

const browser = await chromium.launch();
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
for (const vp of [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 900 },
]) {
  const page = await (await browser.newContext({ viewport: { width: vp.width, height: vp.height } })).newPage();
  const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  await page.context().addCookies([{ name: "pa_session", value: token, url: BASE }]);
  await page.goto(`${BASE}/pohon`, { waitUntil: "domcontentloaded" });
  await page.evaluate((c) => localStorage.setItem("pa_cart_v1", JSON.stringify(c)), CART);
  await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
  console.log(`\n===== /keranjang ${vp.name} (${vp.width}px) =====`);
  const hasil = await ukur(page);
  console.log(JSON.stringify(hasil, null, 1));
  if (hasil.pageOverflow > 1) console.log("ELEMEN OVERFLOW:", JSON.stringify(await elemenOverflow(page), null, 1));
  await page.screenshot({ path: `screenshots/probe-keranjang-${vp.name}.png`, fullPage: vp.width === 390 });

  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
  console.log(`===== /checkout ${vp.name} =====`);
  console.log(JSON.stringify(await ukurCheckout(page)));
  await page.context().close();
}

// Audit overflow semua halaman publik utama di 390px
console.log("\n===== AUDIT scrollWidth 390px =====");
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`${BASE}/pohon`, { waitUntil: "domcontentloaded" });
await page.evaluate((c) => localStorage.setItem("pa_cart_v1", JSON.stringify(c)), CART);
for (const p of ["/", "/pohon", "/lokasi", "/spesies", "/blog", "/faq", "/keuangan", "/kalkulator-karbon", "/cerita-dampak", "/keranjang", "/masuk", "/daftar", "/kontak"]) {
  await auditPage(page, p);
}
await browser.close();
