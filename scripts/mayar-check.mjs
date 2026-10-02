// E2E "Bayar Online" (Mayar) di /dashboard/adopsi/[id] — tanpa API key
// (sandbox key belum tersedia), jalur yang diuji:
//   1. Kartu Bayar Online tampil di order belum dibayar + transfer manual tetap ada
//   2. Klik bayar → fail-soft "belum tersedia" (MAYAR_API_KEY kosong → code 500)
//   3. link_invoice tersimpan (simulasi invoice terbit) → tombol Lanjutkan Pembayaran
//   4. Webhook payment.received tersimulasi → verifikasi OTOMATIS: confirmation=yes
//      (by mayar) + pesan donatur + certnum terbit + status web jadi Adopsi Aktif
//   5. Idempotensi webhook + event lain diabaikan + confirmation tak dikenal ditolak
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = "http://127.0.0.1:8000/api";
const INVOICE = "MAYAR-E2E";
const LINK_MAYAR = "https://testingmayar.myr.id/invoices/e2emayar123";

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
// cleanup sisa run gagal (member e2e_mayar_* + order MAYAR-E2E)
for (const id of rows(`SELECT id FROM member WHERE emaile LIKE 'e2e_mayar_%'`).map((r) => r[0])) {
  rows(`DELETE FROM pesan_notif WHERE idmember=${id}`);
  rows(`DELETE FROM data_basket WHERE id_member=${id}`);
  rows(`DELETE FROM confirmation WHERE idpengasuh=${id}`);
  rows(`DELETE FROM member WHERE id=${id}`);
}
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);

// satu pohon available (snapshot untuk restore). Kolom yang mungkin kosong
// TIDAK boleh di ujung — output `mysql -B` memangkas kolom kosong trailing.
const [POHON] = rows(
  "SELECT IFNULL(adopted,''), IFNULL(pengasuh,''), IFNULL(nama,''), IFNULL(invoice,''), IFNULL(tgl_adopt,''), idpohon, desa FROM data_pohon WHERE adopted='available' AND desa='rantaukermas' ORDER BY id LIMIT 1",
);
const [ADOPTED0, PENGASUH0, NAMA0, INV0, TGL0, KODE, DESA] = POHON;
assert(Boolean(KODE), `pohon fixture ${KODE} (${DESA})`);

// register member via UI (mengikuti alur nyata; kolom NOT NULL member terisi lengkap)
const browser = await chromium.launch();
const email = `e2e_mayar_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Mayar Tester");
await page.fill("#email", email);
await page.fill("#phone", "081234567899");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!MEMBER_ID, `member terbuat id=${MEMBER_ID}`);

// order pending (confirmation=no, tanpa foto) + pohon reserved
rows(
  `UPDATE data_pohon SET adopted='reserved', pengasuh=${MEMBER_ID}, invoice='${INVOICE}', tgl_adopt=CURDATE() WHERE idpohon='${KODE}'`,
);
rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),${MEMBER_ID},'E2E Mayar','${email}','transfer','IDR',100338,CURDATE(),1,'no',NOW(),NOW())`,
);
const CONF_ID = rows(`SELECT id FROM confirmation WHERE invoice='${INVOICE}'`)[0][0];
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${KODE}','${DESA}',${MEMBER_ID},'',100000,'IDR','transfer',CURDATE(),'',0,1,'${INVOICE}','2029-09-27',NOW(),NOW())`,
);
assert(!!CONF_ID, `order pending terpasang (confirmation id ${CONF_ID})`);

// sesi member (halaman order milik sendiri)
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: Number(MEMBER_ID), name: "E2E Mayar Tester", role: "USER" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);

// ============== 1. Kartu Bayar Online tampil ==============
await page.goto(`${BASE}/dashboard/adopsi/${CONF_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Bayar Online — Verifikasi Instan", { timeout: 15000 });
assert(true, "kartu 'Bayar Online — Verifikasi Instan' tampil di order belum dibayar");
assert(
  (await page.getByRole("button", { name: "Bayar Online Sekarang" }).count()) === 1,
  "tombol 'Bayar Online Sekarang' tampil (belum ada invoice)",
);
assert(
  (await page.locator("text=Instruksi Pembayaran").count()) === 1,
  "jalur transfer manual tetap tersedia",
);

// ============== 2. Fail-soft tanpa API key ==============
await page.getByRole("button", { name: "Bayar Online Sekarang" }).click();
await page.waitForSelector("text=Pembayaran online belum tersedia", { timeout: 20000 });
assert(true, "tanpa MAYAR_API_KEY → pesan fail-soft (bukan crash), transfer manual disarankan");
const apiRes = await fetch(`${API}/createinvoice`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: CONF_ID }),
}).then((r) => r.json());
assert(
  Number(apiRes.code) === 500 && String(apiRes.message ?? "").includes("MAYAR_API_KEY"),
  `API createinvoice langsung menolak bersih (${apiRes.code}: ${apiRes.message})`,
);

// ============== 3. Invoice tersimpan → Lanjutkan Pembayaran ==============
rows(`UPDATE confirmation SET link_invoice='${LINK_MAYAR}' WHERE id=${CONF_ID}`);
await page.goto(`${BASE}/dashboard/adopsi/${CONF_ID}`, { waitUntil: "networkidle" });
const lanjut = page.getByRole("link", { name: /Lanjutkan Pembayaran/ });
await lanjut.waitFor({ timeout: 15000 });
assert(
  (await lanjut.getAttribute("href")) === LINK_MAYAR,
  "invoice tersimpan → tombol 'Lanjutkan Pembayaran' membuka link Mayar (tab baru)",
);
assert(
  (await page.getByRole("button", { name: /Periksa status/ }).count()) === 1,
  "tombol 'Periksa status' tersedia setelah invoice dibuat",
);

// ============== 4. Webhook payment.received → verifikasi otomatis ==============
const hook = async (body) =>
  fetch(`${API}/webhookmayar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

let w = await hook({
  event: "payment.received",
  data: {
    id: "uuid-mayar-e2e-1",
    amount: 100338,
    customerEmail: email,
    transactionStatus: "paid",
    extraData: { idconfirmation: Number(CONF_ID), invoice: INVOICE },
  },
});
assert(w.ok === true && Number(w.code) === 200, `webhook payment.received → ${w.message}`);
assert(
  rows(`SELECT confirmation, IFNULL(confirmationBy,'') FROM confirmation WHERE id=${CONF_ID}`)[0]
    .join(",") === "yes,mayar",
  "confirmation terverifikasi OTOMATIS (by mayar) — tanpa admin, tanpa bukti transfer",
);
assert(
  rows(
    `SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID} AND pesan LIKE '%payment has been verified%'`,
  )[0][0] === "1",
  "donatur menerima pesan 'payment has been verified'",
);
const certnum = rows(`SELECT IFNULL(certnum,'') FROM data_adopsi WHERE invoice='${INVOICE}'`)[0][0];
assert(!!certnum && certnum !== "NULL", `certnum terbit otomatis (${certnum})`);

// status web ikut berubah
await page.goto(`${BASE}/dashboard/adopsi/${CONF_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Adopsi Aktif", { timeout: 15000 });
assert(true, "halaman order kini menampilkan 'Adopsi Aktif' + tautan sertifikat");

// ============== 5. Idempotensi + event lain + confirmation tak dikenal ==============
w = await hook({
  event: "payment.received",
  data: { id: "uuid-mayar-e2e-1", extraData: { idconfirmation: Number(CONF_ID) } },
});
assert(
  w.ok === true && String(w.message).includes("sudah diverifikasi"),
  "webhook dikirim ulang → idempoten (tidak dobel verifikasi/pesan)",
);
assert(
  rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "1",
  "tidak ada pesan duplikat",
);
w = await hook({ event: "payment.reminder", data: { id: "x" } });
assert(w.ok === true && w.ignored === "payment.reminder", "event lain (payment.reminder) diabaikan");
w = await hook({
  event: "payment.received",
  data: { id: "uuid-asing", amount: 1, customerEmail: "tak.kenal@x.test", extraData: {} },
});
assert(w.ok === false, "webhook tanpa rujukan confirmation yang dikenal → ditolak");

// ============== Cleanup ==============
rows(`DELETE FROM pesan_notif WHERE idmember=${MEMBER_ID}`);
rows(`DELETE FROM data_basket WHERE id_member=${MEMBER_ID}`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM member WHERE id=${MEMBER_ID}`);
{
  const p = PENGASUH0 === "" ? "NULL" : PENGASUH0;
  const nm = (NAMA0 || "").replace(/'/g, "\\'");
  const iv = INV0 === "" ? "NULL" : `'${INV0}'`;
  const tg = TGL0 === "" || TGL0 === "0000-00-00" ? "NULL" : `'${TGL0}'`;
  rows(
    `UPDATE data_pohon SET adopted='${ADOPTED0}', pengasuh=${p}, nama='${nm}', invoice=${iv}, tgl_adopt=${tg} WHERE idpohon='${KODE}'`,
  );
}
await browser.close();
console.log("=== SEMUA TES BAYAR ONLINE (MAYAR) LULUS ===");
