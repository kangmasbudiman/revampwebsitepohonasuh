// Verifikasi stepper durasi tahun di halaman /keranjang (dev lokal).
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};
const rpRe = (n) => new RegExp(`Rp[\\s\\u00A0\\u202F]?${n.toLocaleString("id-ID")}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Seed keranjang: pohon Rp200.000 + pohon Rp150.000
await page.goto(`${BASE}/keranjang`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem(
    "pa_cart_v1",
    JSON.stringify([
      { code: "C077", localName: "Kayu Surian", desa: "rantaukermas", priceIdr: 200000, photoUrl: null, years: 1 },
      { code: "B004", localName: "Pohon B004", desa: "longlake", priceIdr: 150000, photoUrl: null, years: 2 },
    ]),
  );
});
await page.reload({ waitUntil: "networkidle" });

// ===== 1. Stepper tampil dengan nilai awal =====
const step1 = page.locator('button[aria-label="Kurangi durasi Kayu Surian"]');
const step2 = page.locator('button[aria-label="Tambah durasi Kayu Surian"]');
ok("stepper − tampil", (await step1.count()) === 1);
ok("stepper + tampil", (await step2.count()) === 1);
ok("item 1 awal 1 tahun", (await page.locator("text=Kayu Surian").first().locator("..").locator("..").textContent()).includes("1 tahun"));

// ===== 2. Tambah durasi → harga item & ringkasan naik =====
await step2.click();
await page.waitForTimeout(300);
let teks = await page.locator("div.rounded-2xl.border").filter({ hasText: "Kayu Surian" }).first().textContent();
ok("klik + → 2 tahun", teks.includes("2 tahun"), teks.match(/\d+ tahun/g)?.join(","));
ok("harga item ×2", rpRe(400000).test(teks));
let ringkasan = await page.locator("aside").textContent();
ok("ringkasan: 2 pohon · 4 tahun", ringkasan.includes("2 pohon · 4 tahun"));
ok("ringkasan total 200rb×2 + 150rb×2 = 700rb", rpRe(700000).test(ringkasan));

// ===== 3. Batas atas 5 tahun (tombol + disabled) =====
for (let i = 0; i < 5; i++) await step2.click().catch(() => {});
await page.waitForTimeout(300);
teks = await page.locator("div.rounded-2xl.border").filter({ hasText: "Kayu Surian" }).first().textContent();
ok("maksimum 5 tahun", teks.includes("5 tahun"), teks.match(/\d+ tahun/g)?.join(","));
ok("tombol + disabled di 5", await step2.isDisabled());
ok("tombol − aktif di 5", !(await step1.isDisabled()));
ok("harga item ×5", rpRe(1000000).test(teks));
ringkasan = await page.locator("aside").textContent();
ok("ringkasan 5+2=7 tahun, total 1.300.000", ringkasan.includes("7 tahun") && rpRe(1300000).test(ringkasan));

// ===== 4. Kurangi durasi =====
await step1.click();
await page.waitForTimeout(300);
teks = await page.locator("div.rounded-2xl.border").filter({ hasText: "Kayu Surian" }).first().textContent();
ok("klik − → 4 tahun", teks.includes("4 tahun"));

// ===== 5. Batas bawah 1 tahun =====
for (let i = 0; i < 6; i++) await step1.click().catch(() => {});
await page.waitForTimeout(300);
teks = await page.locator("div.rounded-2xl.border").filter({ hasText: "Kayu Surian" }).first().textContent();
ok("minimum 1 tahun", teks.includes("1 tahun"), teks.match(/\d+ tahun/g)?.join(","));
ok("tombol − disabled di 1", await step1.isDisabled());

// ===== 6. Persist di localStorage setelah reload =====
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pa_cart_v1")));
ok("localStorage: item 1 years=1, item 2 years=2", stored[0].years === 1 && stored[1].years === 2, JSON.stringify(stored.map((i) => [i.code, i.years])));
await page.reload({ waitUntil: "networkidle" });
teks = await page.locator("div.rounded-2xl.border").filter({ hasText: "Kayu Surian" }).first().textContent();
ok("reload → nilai tetap (1 & 2 tahun)", teks.includes("1 tahun"));

// ===== 7. Item kedua stepper independen =====
await page.locator('button[aria-label="Tambah durasi Pohon B004"]').click();
await page.waitForTimeout(300);
const teksB = await page.locator("div.rounded-2xl.border").filter({ hasText: "Pohon B004" }).first().textContent();
ok("item 2 independen → 3 tahun", teksB.includes("3 tahun") && rpRe(450000).test(teksB));

// ===== 8. Badge header keranjang tak berubah (2 pohon) =====
// Sejak ikon keranjang mobile (ddd7268), badge ada 2x di DOM (grup xl:hidden + desktop) — hitung yang terlihat.
ok("badge header tetap 2 pohon", (await page.locator('a[aria-label="Keranjang: 2 pohon"]:visible').count()) === 1);

await page.screenshot({ path: "screenshots/stepper-keranjang.png", fullPage: true });
await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
