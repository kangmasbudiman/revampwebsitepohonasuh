// E2E alur keranjang ala Shopee: guest isi keranjang (badge, hapus, duplikat)
// → checkout minta login → daftar (?next=/checkout) → buat pesanan
// (validasi server: pohon di-reserve orang lain diloncat, sisa trolley mobile
// dibuang) → invoice. DB hanya dibaca untuk assertion; tulis SQL hanya untuk
// setup negatif + cleanup di akhir. Butuh server web (:3000) + Laravel (:8000).
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};

const browser = await chromium.launch();

// ===== 1. Guest buka daftar pohon; ambil kode yang benar-benar tampil =====
const email = `e2ecart_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
await page.waitForTimeout(600); // pastikan React ter-hidrasi sebelum klik
const shown = await page.$$eval('a[href^="/pohon/"]', (els) =>
  [...new Set(els.map((e) => e.getAttribute("href").split("/").pop()))].slice(0, 4),
);
if (shown.length < 4) throw new Error(`halaman /pohon hanya menampilkan ${shown.length} kartu`);

// A,B masuk keranjang dari kartu; C untuk tes duplikat/hapus di halaman detail;
// D (pohon available lain, tidak ikut keranjang) ditanam sebagai sisa trolley mobile.
const [A, B, C] = shown;
const info = Object.fromEntries(
  rows(
    `SELECT idpohon, CONCAT(harga,'|',localname) FROM data_pohon WHERE idpohon IN ('${A}','${B}','${C}')`,
  ).map((r) => [r[0], r[1].split("|")]),
);
const HA = info[A][0];
const HB = info[B][0];
const [D, HD] = rows(
  `SELECT idpohon, harga FROM data_pohon WHERE adopted='available' AND idpohon NOT IN ('${A}','${B}','${C}') ORDER BY id LIMIT 1`,
)[0];

// (Cek loader berlogo kini di scripts/loader-check.mjs khusus — fallback
// loading.tsx tak selalu sempat ter-paint saat stack lokal cepat.)

// ===== 2. Isi keranjang via tombol ikon kartu (guest) =====
await page.locator(`a[href="/pohon/${A}"] button[type=button]`).click();
await page.waitForTimeout(200);
if (page.url() !== `${BASE}/pohon`) throw new Error("klik ikon malah menavigasi (hidrasi?)");
await page.locator(`a[href="/pohon/${B}"] button[type=button]`).click();
await page.waitForTimeout(200);
assert(page.url() === `${BASE}/pohon`, `tombol ikon kartu: ${A} & ${B} masuk keranjang tanpa navigasi`);

// Toggle: klik ulang ikon A saat sudah di keranjang → item keluar (badge 1,
// bingkai oranye hilang); klik lagi → masuk kembali (badge 2, bingkai tampil).
await page.locator(`a[href="/pohon/${A}"] button[type=button]`).click();
await page.waitForSelector('a[aria-label="Keranjang: 1 pohon"]', { timeout: 5000 });
assert(
  (await page.locator(`a[href="/pohon/${A}"] span.border-orange-400`).count()) === 0,
  `toggle off: ${A} keluar keranjang, bingkai oranye hilang`,
);
await page.locator(`a[href="/pohon/${A}"] button[type=button]`).click();
await page.waitForSelector('a[aria-label="Keranjang: 2 pohon"]', { timeout: 5000 });
assert(
  (await page.locator(`a[href="/pohon/${A}"] span.border-orange-400`).count()) >= 1,
  `toggle on: ${A} masuk keranjang lagi, bingkai oranye tampil`,
);

// Guest di halaman detail hanya dapat link login (bukan tombol keranjang).
await page.goto(`${BASE}/pohon/${C}`, { waitUntil: "networkidle" });
await page.waitForSelector('a:has-text("Masuk untuk Mengadopsi")', { timeout: 5000 });
assert((await page.locator('button:has-text("Tambah ke Keranjang")').count()) === 0, `detail ${C} guest: tombol keranjang tak tampil, ada link login`);

await page.waitForSelector('a[aria-label="Keranjang: 2 pohon"]', { timeout: 5000 });
assert(true, "badge header menunjukkan 2 pohon");

// ===== 3. Halaman keranjang guest: item tampil =====
await page.click('a[aria-label^="Keranjang"]');
await page.waitForURL(`${BASE}/keranjang`);
await page.waitForSelector(`text=${A}`);
assert(true, "halaman keranjang menampilkan item guest");

// ===== 4. Checkout minta login → daftar dengan next =====
await page.click("text=Masuk untuk Checkout");
await page.waitForURL(/\/masuk\?next=(\/|%2F)checkout$/, { timeout: 15000 });
assert(true, "guest checkout → /masuk?next=/checkout");
await page.click("text=Daftar sekarang");
await page.waitForURL(/\/daftar\?next=(\/|%2F)checkout$/, { timeout: 15000 });
await page.fill("#name", "E2E Cart Tester");
await page.fill("#email", email);
await page.fill("#phone", "081234567810");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/checkout`, { timeout: 30000 });
assert(true, "daftar → kembali ke /checkout (keranjang localStorage utuh)");

const memberId = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!memberId, `member terbuat id=${memberId}`);

// ===== 4b. Setelah login: tambah dari detail → tombol live jadi status =====
await page.goto(`${BASE}/pohon/${C}`, { waitUntil: "networkidle" });
await page.click("button:has-text('Tambah ke Keranjang')");
await page.waitForSelector("a[href='/keranjang']:has-text('Sudah di Keranjang')", {
  timeout: 5000,
});
assert(true, `detail ${C} (login): masuk keranjang → tombol 'Sudah di Keranjang'`);
await page.waitForSelector('a[aria-label="Keranjang: 3 pohon"]', { timeout: 5000 });
assert(true, "badge header menunjukkan 3 pohon");
await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
await page
  .locator("div", { hasText: C })
  .locator('button[aria-label^="Hapus"]')
  .last()
  .click();
await page.waitForSelector('a[aria-label="Keranjang: 2 pohon"]', { timeout: 5000 });
assert(true, `hapusi ${C} dari keranjang → sisa 2`);
await page.click('a:has-text("Lanjut ke Pembayaran")');
await page.waitForURL(`${BASE}/checkout`);

// ===== 5. Setup negatif: sisa trolley mobile + pohon A diambil orang =====
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "INSERT INTO data_basket (id_pohon, id_member, y, gift_to, nama, tanggal, kurs, pesan, subtotal) VALUES ('${D}', ${memberId}, 1, 0, 'Sisa Trolley Mobile', CURDATE(), 14000, NULL, ${HD})" 2>/dev/null`,
);
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE data_pohon SET adopted='reserved' WHERE idpohon='${A}'" 2>/dev/null`,
);
assert(true, `setup: trolley mobile berisi ${D}; ${A} di-reserve pihak lain`);

// ===== 6. Buat pesanan =====
await page.waitForSelector(`text=${B}`, { timeout: 15000 });
await page.click("button:has-text('Buat Pesanan')");
await page.waitForSelector("text=tidak lagi tersedia", { timeout: 30000 });
assert(true, `${A} dilaporkan tidak tersedia (dikeluarkan otomatis)`);
await page.click("text=Lihat Invoice");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
const confId = page.url().match(/\/dashboard\/adopsi\/(\d+)/)[1];
assert(true, `pesanan dibuat → /dashboard/adopsi/${confId}`);
await page.waitForSelector("text=Instruksi Pembayaran", { timeout: 15000 });

// ===== 7. Assertion DB =====
const [invoice, price, jml, conf] = rows(
  `SELECT invoice, price, jml_pohon, confirmation FROM confirmation WHERE id=${confId}`,
)[0];
assert(conf === "no", `confirmation=${conf}`);
const uniq = Number(price) - Number(HB);
assert(
  Number(jml) === 1 && uniq >= 100 && uniq <= 999,
  `price=${price} = harga ${HB} + kode unik ${uniq}, jml_pohon=1`,
);
const adopsi = rows(`SELECT idpohon FROM data_adopsi WHERE invoice='${invoice}'`);
assert(
  adopsi.length === 1 && adopsi[0][0] === B,
  `data_adopsi hanya berisi ${B} (${D} dari trolley mobile TIDAK ikut)`,
);
const status = Object.fromEntries(
  rows(`SELECT idpohon, adopted FROM data_pohon WHERE idpohon IN ('${A}','${B}','${D}')`).map(
    (r) => [r[0], r[1]],
  ),
);
assert(status[B] === "reserved", `${B} reserved`);
assert(status[A] === "reserved", `${A} tetap reserved (milik orang lain, tak tersentuh)`);
assert(status[D] === "available", `${D} tetap available (sisa trolley dibuang)`);
const basket = rows(`SELECT COUNT(*) FROM data_basket WHERE id_member=${memberId}`)[0][0];
assert(Number(basket) === 0, "basket server kosong setelah checkout");

// ===== 8. Keranjang lokal terbersihkan =====
await page.goto(`${BASE}/keranjang`);
await page.waitForSelector("text=Keranjang masih kosong", { timeout: 10000 });
assert(true, "keranjang lokal kosong setelah checkout sukses");

// ===== Cleanup data test =====
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM data_adopsi WHERE invoice='${invoice}'; DELETE FROM confirmation WHERE id=${confId}; UPDATE data_pohon SET adopted='available' WHERE idpohon IN ('${A}','${B}'); DELETE FROM member WHERE id=${memberId}" 2>/dev/null`,
);
console.log("· cleanup: order, data_adopsi, member dihapus; A & B balik available");

await browser.close();
console.log("\n=== SEMUA TAHAP E2E KERANJANG LULUS ===");
