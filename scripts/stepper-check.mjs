// Verifikasi stepper durasi tahun di halaman /keranjang (dev lokal) —
// tanpa batas atas 5 tahun: input angka bebas, − / + tetap jalan,
// guard senyap 100 tahun di lapis simpan.
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

const inA = page.locator('input[aria-label="Ubah durasi Kayu Surian"]');
const step1 = page.locator('button[aria-label="Kurangi durasi Kayu Surian"]');
const step2 = page.locator('button[aria-label="Tambah durasi Kayu Surian"]');
const teksItemA = () =>
  page.locator("div.rounded-2xl.border").filter({ hasText: "Kayu Surian" }).first().textContent();

// ===== 1. Stepper tampil dengan nilai awal =====
ok("stepper − tampil", (await step1.count()) === 1);
ok("stepper + tampil", (await step2.count()) === 1);
ok("input durasi tampil", (await inA.count()) === 1);
ok("item 1 awal 1 tahun", (await inA.inputValue()) === "1");

// ===== 2. Tambah durasi → harga item & ringkasan naik =====
await step2.click();
await page.waitForTimeout(300);
let teks = await teksItemA();
ok("klik + → 2 tahun", (await inA.inputValue()) === "2");
ok("harga item ×2", rpRe(400000).test(teks));
let ringkasan = await page.locator("aside").textContent();
ok("ringkasan: 2 pohon · 4 tahun", ringkasan.includes("2 pohon · 4 tahun"));
ok("ringkasan total 200rb×2 + 150rb×2 = 700rb", rpRe(700000).test(ringkasan));

// ===== 3. Tanpa batas atas: isi 7 tahun lewat input =====
await inA.fill("7");
await page.waitForTimeout(300);
teks = await teksItemA();
ok("isi input 7 tahun", (await inA.inputValue()) === "7");
ok("tombol + TIDAK disabled di 7 (tanpa batas)", !(await step2.isDisabled()));
ok("harga item ×7", rpRe(1400000).test(teks));
ringkasan = await page.locator("aside").textContent();
ok("ringkasan 7+2=9 tahun, total 1.700.000", ringkasan.includes("9 tahun") && rpRe(1700000).test(ringkasan));

// ===== 3b. Guard senyap 100 tahun (tgl_exp DATE maks 9999) =====
await inA.fill("250");
await page.waitForTimeout(300);
ok("isi 250 → dikunci senyap ke 100", (await inA.inputValue()) === "100");
ok("harga item ×100", rpRe(20000000).test(await teksItemA()));

// ===== 4. Kurangi durasi =====
await step1.click();
await page.waitForTimeout(300);
ok("klik − → 99 tahun", (await inA.inputValue()) === "99");

// ===== 5. Batas bawah 1 tahun =====
await inA.fill("1");
await page.waitForTimeout(200);
await inA.fill(""); // kosong lalu blur → kembali 1
await inA.blur();
await page.waitForTimeout(300);
ok("minimum 1 tahun", (await inA.inputValue()) === "1");
ok("tombol − disabled di 1", await step1.isDisabled());

// ===== 6. Persist di localStorage setelah reload =====
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pa_cart_v1")));
ok("localStorage: item 1 years=1, item 2 years=2", stored[0].years === 1 && stored[1].years === 2, JSON.stringify(stored.map((i) => [i.code, i.years])));
await page.reload({ waitUntil: "networkidle" });
ok("reload → nilai tetap 1", (await inA.inputValue()) === "1");

// ===== 7. Item kedua stepper independen =====
await page.locator('button[aria-label="Tambah durasi Pohon B004"]').click();
await page.waitForTimeout(300);
const teksB = await page.locator("div.rounded-2xl.border").filter({ hasText: "Pohon B004" }).first().textContent();
ok("item 2 independen → 3 tahun", rpRe(450000).test(teksB));
ok(
  "input item 2 = 3",
  (await page.locator('input[aria-label="Ubah durasi Pohon B004"]').inputValue()) === "3",
);

// ===== 8. Badge header keranjang tak berubah (2 pohon) =====
// Sejak ikon keranjang mobile (ddd7268), badge ada 2x di DOM (grup xl:hidden + desktop) — hitung yang terlihat.
ok("badge header tetap 2 pohon", (await page.locator('a[aria-label="Keranjang: 2 pohon"]:visible').count()) === 1);

await page.screenshot({ path: "screenshots/stepper-keranjang.png", fullPage: true });
await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
