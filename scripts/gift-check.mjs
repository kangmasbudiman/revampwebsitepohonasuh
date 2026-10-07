// E2E Fitur 3 — kirim sertifikat hadiah (WA/Email) di detail order ACTIVE.
//   1. Order hadiah (data_adopsi.nama terisi): tombol "Kirim ke Penerima" muncul
//   2. Modal: pratinjau pesan memuat nama penerima + tautan /sertifikat/
//   3. WA: input non-digit tersaring, 08xx dinormalisasi ke 62, window.open
//      dibuka ke wa.me dengan teks ter-encode; nomor pendek ditolak
//   4. Email: jalur server action → backend fail-soft (SMTP belum dikonfigurasi)
//   5. Escape menutup modal
//   6. Order non-hadiah (nama kosong, ada certnum): tombol kirim TIDAK muncul
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";

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

// ============== Fixture ==============
for (const id of rows(`SELECT id FROM member WHERE emaile LIKE 'e2e_gift_%'`).map((r) => r[0])) {
  rows(`DELETE FROM data_adopsi WHERE pengasuh=${id}`);
  rows(`DELETE FROM confirmation WHERE idpengasuh=${id}`);
  rows(`DELETE FROM data_basket WHERE id_member=${id}`);
  rows(`DELETE FROM member WHERE id=${id}`);
}

const browser = await chromium.launch();
const email = `e2e_gift_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Gift Donatur");
await page.fill("#email", email);
await page.fill("#phone", `0899${String(Date.now()).slice(-8)}`);
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!MEMBER_ID, `member terbuat id=${MEMBER_ID}`);

// Dua order ACTIVE: A = hadiah (nama penerima), B = biasa (nama kosong).
// invoice confirmation varchar(15) → pakai base-36 agar pendek.
const TS = Date.now().toString(36).toUpperCase();
const [TREE, DESA, HARGA] = rows(
  "SELECT idpohon, desa, harga FROM data_pohon WHERE adopted='available' ORDER BY id LIMIT 1",
)[0];
assert(!!TREE, `pohon fixture ${TREE} (${DESA})`);
const tgl = new Date().toISOString().slice(0, 10);
for (const [suffix, nama, certnum] of [
  ["A", "Budi Penerima Hadiah", `90/E2EGA/${TS}`],
  ["B", "", `91/E2EGB/${TS}`],
]) {
  const inv = `#G${TS}${suffix}`;
  rows(
    `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation) VALUES ('${inv}','${tgl}',${MEMBER_ID},'E2E Gift Donatur','${email}','Transfer','IDR',${Number(HARGA) + 123},'${tgl}',1,'yes')`,
  );
  rows(
    `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,gfrom,certnum,dur,memo,admin,proses,invoice,tgl_exp) VALUES ('${TREE}','${DESA}',${MEMBER_ID},'${nama}',${HARGA},'IDR','Transfer','${tgl}',0,'${certnum}',1,'',0,3,'${inv}',DATE_ADD('${tgl}', INTERVAL 1 YEAR))`,
  );
}
const CONF_A = rows(`SELECT id FROM confirmation WHERE invoice='#G${TS}A'`)[0][0];
const CONF_B = rows(`SELECT id FROM confirmation WHERE invoice='#G${TS}B'`)[0][0];
assert(!!CONF_A && !!CONF_B, `order A=${CONF_A} B=${CONF_B}`);

// ============== 1-3. Order hadiah: tombol + modal + WA ==============
await page.goto(`${BASE}/dashboard/adopsi/${CONF_A}`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Adopsi Aktif", { timeout: 15000 });
assert(true, "order A berstatus ACTIVE");
assert(
  (await page.locator("text=Sertifikat a.n. Budi Penerima Hadiah").count()) >= 1,
  "detail pohon menampilkan nama penerima hadiah",
);
const btnKirim = page.locator("button:has-text('Kirim ke Penerima')");
assert((await btnKirim.count()) === 1, "tombol 'Kirim ke Penerima' muncul di order hadiah");

await btnKirim.click();
await page.waitForSelector("role=dialog", { timeout: 10000 });
assert(true, "modal kirim terbuka");
const preview = await page.locator("text=Pratinjau pesan").locator("xpath=following-sibling::p").first().textContent();
assert(preview.includes("Budi Penerima Hadiah"), "pratinjau memuat nama penerima");
assert(preview.includes("/sertifikat/"), `pratinjau memuat tautan sertifikat (${BASE}/sertifikat/…)`);
assert(preview.includes("E2E Gift Donatur"), "pratinjau memuat nama pengirim");

// window.open di-stub agar tidak membuka tab sungguhan
await page.evaluate(() => {
  window.open = (url) => {
    window.__waUrl = url;
    return null;
  };
});
await page.fill("#gift-wa", "0812-3456-7890");
assert((await page.inputValue("#gift-wa")) === "081234567890", "input WA menyaring non-digit");
await page.click("button:has-text('WA')");
const waUrl = await page.evaluate(() => window.__waUrl);
assert(waUrl.startsWith("https://wa.me/6281234567890?text="), `wa.me memakai 62xx (${waUrl?.slice(0, 30)}…)`);
const waText = decodeURIComponent(waUrl.split("?text=")[1] ?? "");
assert(waText.includes("Budi Penerima Hadiah") && waText.includes("/sertifikat/"), "teks WA berisi penerima + tautan");

// nomor pendek → pesan error, window.open tidak terpanggil lagi
await page.evaluate(() => {
  window.__waUrl = null;
});
await page.fill("#gift-wa", "123");
await page.click("button:has-text('WA')");
assert((await page.locator("text=Nomor WhatsApp belum valid").count()) === 1, "nomor pendek ditolak");
assert((await page.evaluate(() => window.__waUrl)) === null, "window.open tidak dipanggil utk nomor invalid");

// ============== 4. Email fail-soft ==============
await page.fill("#gift-email", "penerima.tidakada@test.local");
await page.click("button:has-text('Email')");
await page.waitForSelector("p:text-matches('SMTP|gagal terkirim|Terkirim', 'i')", { timeout: 30000 });
const emailMsg = await page.locator("p:text-matches('SMTP|gagal terkirim|Terkirim', 'i')").first().textContent();
assert(/SMTP|gagal/i.test(emailMsg ?? ""), `email → pesan fail-soft tampil ("${emailMsg}")`);

// ============== 5. Escape menutup modal ==============
await page.keyboard.press("Escape");
await page.waitForSelector("role=dialog", { state: "detached", timeout: 5000 });
assert(true, "Escape menutup modal");

// ============== 6. Order biasa: tanpa tombol kirim ==============
await page.goto(`${BASE}/dashboard/adopsi/${CONF_B}`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Adopsi Aktif", { timeout: 15000 });
assert((await page.locator("button:has-text('Kirim')").count()) === 0, "order non-hadiah: tombol kirim tidak muncul");
assert((await page.locator("text=Sertifikat").count()) >= 1, "tombol sertifikat tetap ada di order non-hadiah");

// ============== Cleanup ==============
rows(`DELETE FROM data_adopsi WHERE pengasuh=${MEMBER_ID}`);
rows(`DELETE FROM confirmation WHERE idpengasuh=${MEMBER_ID}`);
rows(`DELETE FROM data_basket WHERE id_member=${MEMBER_ID}`);
rows(`DELETE FROM member WHERE id=${MEMBER_ID}`);
assert(true, "fixture dibersihkan");

await browser.close();
console.log("\nSEMUA ASSERTION GIFT-CHECK LULUS ✔");
