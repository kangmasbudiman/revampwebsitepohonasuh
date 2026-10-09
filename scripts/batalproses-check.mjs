// E2E "Batalkan Proses" (petugas) di /admin/tagging: petugas (level 2) TIDAK
// melihat "Batalkan Order" — hanya "Batalkan Proses" di order proses=2, yang
// mengembalikan order ke Baru (proses=1) + menghapus foto tagging siklus ini,
// TANPA membatalkan order (confirmation tetap yes, data_adopsi tetap ada).
// Admin (level 1) tetap melihat "Batalkan Order". Backend menolak proses=3.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
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

const INVOICE = "BATALPR-E2E";

// ============== Fixture (cleanup sisa, simpan state asli, pasang dummy) ==============
rows(`DELETE FROM foto_tagging WHERE idpohon IN (SELECT idpohon FROM data_adopsi WHERE invoice='${INVOICE}')`);
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);

const POHONS = rows(
  "SELECT idpohon, IFNULL(adopted,''), IFNULL(pengasuh,''), IFNULL(nama,''), IFNULL(invoice,''), IFNULL(tgl_adopt,''), 'x' FROM data_pohon WHERE desa='rantaukermas' AND adopted='available' ORDER BY id LIMIT 2",
).map((r) => r.slice(0, 6));
assert(POHONS.length === 2, `2 pohon fixture available rantaukermas (${POHONS.map((p) => p[0]).join(", ")})`);
const [P1, P2] = POHONS.map((p) => p[0]);
for (const [kode] of POHONS) {
  rows(
    `UPDATE data_pohon SET adopted='reserved', pengasuh=2683, nama='Uji Batal Proses', invoice='${INVOICE}', tgl_adopt=CURDATE() WHERE idpohon='${kode}'`,
  );
}

rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),2683,'E2E Batal Proses','e2e@batal.test','transfer','IDR',200000,CURDATE(),2,'yes','E2E',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${P1}','rantaukermas',2683,'Uji Batal Proses 1',100000,'IDR','transfer',CURDATE(),'',0,2,'${INVOICE}','2029-09-27',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${P2}','rantaukermas',2683,'Uji Batal Proses 2',100000,'IDR','transfer',CURDATE(),'',0,3,'${INVOICE}','2029-09-27',NOW(),NOW())`,
);
const ADOPSI1 = Number(rows(`SELECT id FROM data_adopsi WHERE invoice='${INVOICE}' AND idpohon='${P1}'`)[0][0]);
const ADOPSI2 = Number(rows(`SELECT id FROM data_adopsi WHERE invoice='${INVOICE}' AND idpohon='${P2}'`)[0][0]);
rows(`INSERT INTO foto_tagging (idpohon,tanggal,foto,keterangan,idmember,idadopsi,urlGambar) VALUES ('${P1}',CURDATE(),'dummy-e2e.jpg','fixture batalproses',2683,${ADOPSI1},'http://127.0.0.1:8001/upload/taging/dummy-e2e.jpg')`);
assert(Boolean(ADOPSI1 && ADOPSI2), `fixture: adopsi ${P1} proses=2 (id ${ADOPSI1}) + ${P2} proses=3 (id ${ADOPSI2}) + 1 foto`);

// ============== Backend guard: proses=3 ditolak ==============
const res409 = await fetch(`${API}/batalproses`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: ADOPSI2 }),
}).then((r) => r.json());
assert(Number(res409.value) === 409, `endpoint batalproses MENOLAK proses=3 (value=${res409.value})`);
const masih3 = rows(`SELECT proses FROM data_adopsi WHERE id=${ADOPSI2}`)[0][0];
assert(masih3 === "3", `${P2} tetap proses=3`);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const tokenPetugas = await new SignJWT({ userId: 2683, name: "Petugas E2E", role: "ADMIN", level: 2 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const tokenAdmin = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const browser = await chromium.launch();

// ============== 1. Petugas: tombol yang benar ==============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: tokenPetugas, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
  const kartu1 = page.locator("main .rounded-2xl", { hasText: P1 }).first();
  await kartu1.waitFor({ timeout: 30000 });
  assert(
    (await kartu1.getByRole("button", { name: "Batalkan Proses" }).count()) === 1,
    `PETUGAS: kartu ${P1} (Diproses) punya tombol Batalkan Proses`,
  );
  assert(
    (await kartu1.getByRole("button", { name: "Batalkan Order" }).count()) === 0,
    `PETUGAS: kartu ${P1} TANPA tombol Batalkan Order`,
  );
  const kartu2 = page.locator("main .rounded-2xl", { hasText: P2 }).first();
  assert(
    (await kartu2.getByRole("button", { name: "Batalkan Proses" }).count()) === 0,
    `PETUGAS: kartu ${P2} (Selesai) TANPA tombol batal proses`,
  );

  // jalur aman dulu
  await kartu1.getByRole("button", { name: "Batalkan Proses" }).click();
  const modal = page.locator("[role='dialog'][aria-label='Konfirmasi pembatalan proses']");
  await modal.waitFor({ timeout: 10000 });
  assert(
    (await modal.getByRole("heading", { name: "Batalkan proses tagging ini?" }).count()) === 1,
    "modal konfirmasi tampil dengan judul",
  );
  fs.mkdirSync("screenshots", { recursive: true });
  await modal.screenshot({ path: "screenshots/batalproses-modal.png" });
  await modal.getByRole("button", { name: "Tidak, Kembali" }).click();
  await modal.waitFor({ state: "hidden", timeout: 5000 });
  assert(rows(`SELECT id FROM data_adopsi WHERE id=${ADOPSI1} AND proses=2`).length === 1, "tombol Tidak menutup modal TANPA perubahan");

  // jalankan pembatalan proses
  await kartu1.getByRole("button", { name: "Batalkan Proses" }).click();
  await modal.waitFor({ timeout: 10000 });
  await modal.getByRole("button", { name: "Ya, Batalkan Proses" }).click();
  await page.locator("text=/Proses tagging dibatalkan/").waitFor({ timeout: 30000 });
  assert(true, "banner sukses pembatalan proses tampil");

  // verifikasi DB: proses=1, foto terhapus, ORDER TETAP ADA
  assert(rows(`SELECT id FROM data_adopsi WHERE id=${ADOPSI1} AND proses=1`).length === 1, `${P1}: proses kembali ke 1 (Baru)`);
  assert(rows(`SELECT id FROM data_adopsi WHERE id=${ADOPSI1}`).length === 1, "baris data_adopsi TETAP ADA (order tidak batal)");
  assert(rows(`SELECT id FROM confirmation WHERE invoice='${INVOICE}' AND confirmation='yes'`).length === 1, "confirmation tetap 'yes'");
  assert(rows(`SELECT id FROM foto_tagging WHERE idadopsi=${ADOPSI1}`).length === 0, "foto tagging siklus ini terhapus");
  assert(
    rows(`SELECT id FROM pesan_notif WHERE idmember=2683 AND pesan LIKE '%canceled%' AND id > (SELECT MAX(id)-5 FROM pesan_notif WHERE idmember=2683)`).length === 0,
    "donatur TIDAK menerima pesan pembatalan",
  );

  // kartu kini di tab Baru
  await page.goto(`${BASE}/admin/tagging?proses=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  assert(
    (await page.locator("main .rounded-2xl", { hasText: P1 }).count()) === 1,
    `${P1} muncul di tab BARU`,
  );
  await ctx.close();
}

// ============== 2. Admin: tombol batal order tetap ada ==============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: tokenAdmin, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
  const kartu1 = page.locator("main .rounded-2xl", { hasText: P1 }).first();
  await kartu1.waitFor({ timeout: 30000 });
  assert(
    (await kartu1.getByRole("button", { name: "Batalkan Order" }).count()) === 1,
    `ADMIN: kartu ${P1} tetap punya tombol Batalkan Order`,
  );
  assert(
    (await kartu1.getByRole("button", { name: "Batalkan Proses" }).count()) === 0,
    `ADMIN: kartu ${P1} tanpa tombol Batalkan Proses`,
  );
  await ctx.close();
}

// ============== Cleanup (pulihkan state pohon asli) ==============
rows(`DELETE FROM foto_tagging WHERE idadopsi IN (${ADOPSI1},${ADOPSI2})`);
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
for (const [kode, adopted, pengasuh, nama, inv, tgl] of POHONS) {
  const p = pengasuh === "" ? "NULL" : pengasuh;
  const nm = (nama || "").replace(/'/g, "\\'");
  const iv = inv === "" ? "NULL" : `'${inv}'`;
  const tg = tgl === "" || tgl === "0000-00-00" ? "NULL" : `'${tgl}'`;
  const ad = adopted === "" ? "adopted" : adopted;
  rows(
    `UPDATE data_pohon SET adopted='${ad}', pengasuh=${p}, nama='${nm}', invoice=${iv}, tgl_adopt=${tg} WHERE idpohon='${kode}'`,
  );
}
await browser.close();
console.log("=== SEMUA TES BATAL PROSES PETUGAS LULUS ===");
