// Uji PRODUKSI (pohonasuh.io): pembelian via web dengan Mayar SANDBOX end-to-end.
// Daftar → adopsi pohon → "Bayar Online Sekarang" → invoice sandbox (*.myr.lat)
// → PAY → QRIS → SIMULATE PAYMENT → webhook NYATA Mayar→rest.pohonasuh.io →
// order terverifikasi otomatis (confirmation=yes/mayar + certnum + pesan) →
// web "Adopsi Aktif". Semua debris dibersihkan + pohon direstore di akhir.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = "https://pohonasuh.io";
const KEY = execSync(
  `ssh pohonasuh-vps "grep '^MAYAR_API_KEY=' /var/www/apps/pohonasuh/rest-api-pohonasuh/.env | cut -d= -f2"`,
)
  .toString()
  .trim();
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const PW = execSync(
  `ssh pohonasuh-vps "grep '^MYSQL_ROOT_PASSWORD=' /var/www/apps/pohonasuh/.env | cut -d= -f2"`,
).toString().trim();
const sql = (q) =>
  execSync(
    `ssh pohonasuh-vps "docker exec pohonasuh-mysql mysql -uroot -p'${PW}' -N -e \\"${q}\\"" 2>/dev/null`,
  ).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tungguDb(query, expected, timeoutMs = 30000) {
  const mulai = Date.now();
  while (Date.now() - mulai < timeoutMs) {
    try { if (sql(query) === expected) return true; } catch {}
    await sleep(2000);
  }
  return false;
}

// ---- cleanup sisa run gagal ----
const sisa = sql(
  `SELECT IFNULL(GROUP_CONCAT(id),'') FROM pohonasuh.member WHERE emaile LIKE 'e2e_mayarweb_%'`,
);
if (sisa) {
  for (const id of sisa.split(",")) {
    sql(`DELETE FROM pohonasuh.pesan_notif WHERE idmember=${id}`);
    sql(`DELETE FROM pohonasuh.data_basket WHERE id_member=${id}`);
  }
  sql(`DELETE FROM pohonasuh.confirmation WHERE idpengasuh IN (${sisa})`);
  sql(`DELETE FROM pohonasuh.data_adopsi WHERE pengasuh IN (${sisa})`);
  sql(`DELETE FROM pohonasuh.member WHERE id IN (${sisa})`);
}

// ---- pohon fixture + snapshot (sentinel [] — kolom kosong trailing tidak ter-trim) ----
const KODE = sql(
  `SELECT idpohon FROM pohonasuh.data_pohon WHERE adopted='available' ORDER BY id LIMIT 1`,
);
if (!KODE) throw new Error("tidak ada pohon available");
const snap = sql(
  `SELECT CONCAT('[',IFNULL(adopted,''),'|',IFNULL(pengasuh,''),'|',IFNULL(nama,''),'|',IFNULL(invoice,''),'|',IFNULL(tgl_adopt,''),']') FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`,
);
const [ADOPTED0, PENGASUH0, NAMA0, INV0, TGL0] = snap.slice(1, -1).split("|");
console.log(`pohon fixture: ${KODE} (snapshot ${snap})`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
fsMkdir();
page.on("response", (r) => {
  if (r.status() >= 400) console.log(`HTTP ${r.status()} — ${r.request().method()} ${r.url().slice(0, 90)}`);
});

// ================= 1. Daftar akun =================
const email = `e2e_mayarweb_${Date.now()}@test.local`;
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Mayar Web");
await page.fill("#email", email);
await page.fill("#phone", "081234567899");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL("**/dashboard", { timeout: 30000 });
const MEMBER_ID = sql(`SELECT id FROM pohonasuh.member WHERE emaile='${email}'`);
ok("daftar akun baru di produksi", !!MEMBER_ID, `id=${MEMBER_ID}`);

// ================= 2. Adopsi pohon → order pending =================
await page.goto(`${BASE}/pohon/${KODE}`, { waitUntil: "networkidle" });
await page.click("button:text-is('Adopsi Sekarang')");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
const CONF_ID = page.url().match(/\/dashboard\/adopsi\/(\d+)/)[1];
const INVOICE = sql(`SELECT invoice FROM pohonasuh.confirmation WHERE id=${CONF_ID}`);
ok("adopsi → order pending dibuat", sql(`SELECT confirmation FROM pohonasuh.confirmation WHERE id=${CONF_ID}`) === "no", `conf=${CONF_ID} invoice=${INVOICE}`);

// ================= 3. Bayar Online → invoice sandbox nyata =================
await page.waitForSelector("text=Bayar Online — Verifikasi Instan", { timeout: 15000 });
ok("kartu Bayar Online tampil di order belum dibayar", true);
await page.getByRole("button", { name: "Bayar Online Sekarang" }).click();
const lanjut = page.getByRole("link", { name: /Lanjutkan Pembayaran/ });
await lanjut.waitFor({ timeout: 45000 });
const LINK = await lanjut.getAttribute("href");
ok("invoice sandbox terbit", LINK.includes("myr.lat"), LINK);
const linkDb = sql(`SELECT IFNULL(link_invoice,'') FROM pohonasuh.confirmation WHERE id=${CONF_ID}`);
ok("link_invoice tersimpan di DB", linkDb === LINK);
const IDINV = sql(`SELECT IFNULL(idinvoice_mayar,'') FROM pohonasuh.confirmation WHERE id=${CONF_ID}`);
ok("idinvoice_mayar tersimpan", !!IDINV, IDINV);

const invAwal = await mayar(`/invoices/${IDINV}`);
ok("Mayar API: invoice status awal unpaid", String(invAwal?.data?.status ?? "") !== "paid", String(invAwal?.data?.status));

// ================= 4. Halaman bayar sandbox: PAY → QRIS → SIMULATE =================
const bayar = await ctx.newPage();
await bayar.goto(LINK, { waitUntil: "networkidle", timeout: 60000 });
await bayar.waitForTimeout(2500);
await bayar.screenshot({ path: "screenshots/vps-mayar-1-invoice.png", fullPage: true });

await klikTeks(bayar, /^(pay|bayar)$/i, "tombol PAY");
await bayar.waitForTimeout(2500);
await bayar.screenshot({ path: "screenshots/vps-mayar-2-channel.png", fullPage: true });

await klikTeks(bayar, /qris/i, "channel QRIS");
await bayar.waitForTimeout(2500);
await bayar.screenshot({ path: "screenshots/vps-mayar-3-qris.png", fullPage: true });

await klikTeks(bayar, /simulate/i, "SIMULATE PAYMENT");
await bayar.waitForTimeout(3000);
await bayar.screenshot({ path: "screenshots/vps-mayar-4-sukses.png", fullPage: true });

// ================= 5. Webhook nyata → verifikasi otomatis =================
const verified = await tungguDb(
  `SELECT CONCAT(confirmation,',',IFNULL(confirmationBy,'')) FROM pohonasuh.confirmation WHERE id=${CONF_ID}`,
  "yes,mayar",
  90000,
);
ok("webhook NYATA Mayar→VPS → confirmation=yes by mayar", verified);

const invAkhir = await mayar(`/invoices/${IDINV}`);
ok("Mayar API: invoice status paid", String(invAkhir?.data?.status ?? "") === "paid", String(invAkhir?.data?.status));

const certnum = sql(
  `SELECT IFNULL(certnum,'') FROM pohonasuh.data_adopsi WHERE invoice='${INVOICE}' AND certnum IS NOT NULL AND certnum<>'' LIMIT 1`,
);
ok("certnum terbit otomatis", !!certnum, certnum);
ok(
  "pesan 'payment has been verified' untuk donatur",
  sql(`SELECT COUNT(*) FROM pohonasuh.pesan_notif WHERE idmember=${MEMBER_ID} AND pesan LIKE '%payment has been verified%'`) === "1",
);

// ================= 6. Web menampilkan Adopsi Aktif =================
await page.click("button:has-text('Periksa status')");
await page.waitForSelector("text=Adopsi Aktif", { timeout: 20000 });
ok("web: order kini 'Adopsi Aktif' (tanpa upload bukti)", true);
await page.screenshot({ path: "screenshots/vps-mayar-5-aktif.png", fullPage: true });

// ================= Cleanup =================
sql(`DELETE FROM pohonasuh.pesan_notif WHERE idmember=${MEMBER_ID}`);
sql(`DELETE FROM pohonasuh.data_basket WHERE id_member=${MEMBER_ID}`);
sql(`DELETE FROM pohonasuh.data_adopsi WHERE invoice='${INVOICE}'`);
sql(`DELETE FROM pohonasuh.confirmation WHERE id=${CONF_ID}`);
sql(`DELETE FROM pohonasuh.member WHERE id=${MEMBER_ID}`);
const p = PENGASUH0 === "" ? "NULL" : PENGASUH0;
const iv = INV0 === "" ? "NULL" : `'${INV0}'`;
const tg = TGL0 === "" || TGL0 === "0000-00-00" ? "NULL" : `'${TGL0}'`;
sql(
  `UPDATE pohonasuh.data_pohon SET adopted='${ADOPTED0}', pengasuh=${p}, nama='${NAMA0.replace(/'/g, "\\'")}', invoice=${iv}, tgl_adopt=${tg} WHERE idpohon='${KODE}'`,
);
ok(
  "debris dibersihkan + pohon direstore",
  sql(`SELECT COUNT(*) FROM pohonasuh.confirmation WHERE id=${CONF_ID}`) === "0" &&
    sql(`SELECT adopted FROM pohonasuh.data_pohon WHERE idpohon='${KODE}'`) === ADOPTED0,
);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS (MAYAR SANDBOX PRODUKSI)" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);

// ================= helpers =================
function fsMkdir() {
  execSync("mkdir -p screenshots");
}
async function mayar(path) {
  const r = await fetch(`https://api.mayar.io/hl/v2${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  return r.json().catch(() => ({}));
}
// SPA Mayar sering menolak actionability check Playwright → klik via el.click().
async function klikTeks(pg, re, label) {
  const cocok = pg.locator("button, a, [role=button]").filter({ hasText: re });
  const n = await cocok.count();
  if (n === 0) {
    const semua = await pg.locator("button, a, [role=button]").allTextContents();
    console.log(`   [${label}] tidak ketemu. tombol tersedia: ${JSON.stringify(semua.filter(Boolean).slice(0, 20))}`);
    ok(label, false, "tidak ditemukan");
    return;
  }
  await cocok.first().evaluate((el) => el.click());
  console.log(`   [${label}] diklik`);
}
