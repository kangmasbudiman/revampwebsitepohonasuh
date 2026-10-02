// E2E "Batalkan Order" di /admin/tagging: tombol (hanya proses≠3) memanggil
// batalverivication → invoice=cancel, SEMUA pohon invoice (termasuk yang
// sudah selesai) dikembalikan available + field adopsi dibersihkan, baris
// adopsi & foto tagging terhapus, donatur dapat pesan. Fixture 2 pohon satu
// invoice (proses 1 & 3) di desa petugas 2683; state pohon dipulihkan di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
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

const INVOICE = "CANCEL-E2E";

// ============== Fixture (cleanup sisa, simpan state asli, pasang dummy) ==============
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM pesan_notif WHERE idmember=2683 AND pesan LIKE '%canceled%'`);

// dua pohon available di rantaukermas (desa petugas 2683) — simpan state aslinya
const POHONS = rows(
  "SELECT idpohon, IFNULL(adopted,''), IFNULL(pengasuh,''), IFNULL(nama,''), IFNULL(invoice,''), IFNULL(tgl_adopt,'') FROM data_pohon WHERE desa='rantaukermas' AND adopted='available' ORDER BY id LIMIT 2",
);
assert(POHONS.length === 2, `2 pohon fixture available rantaukermas (${POHONS.map((p) => p[0]).join(", ")})`);
const [P1, P2] = POHONS.map((p) => p[0]);
// sisipkan koma pada nama/nama asli saat RESTORE (kolom 3 = nama)
for (const [kode, adopted, pengasuh, nama, inv, tgl] of POHONS) {
  rows(
    `UPDATE data_pohon SET adopted='reserved', pengasuh=2683, nama='Uji Cancel E2E', invoice='${INVOICE}', tgl_adopt=CURDATE() WHERE idpohon='${kode}'`,
  );
}

const KONF_ID = rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),2683,'E2E Cancel','e2e@cancel.test','transfer','IDR',200000,CURDATE(),2,'yes','E2E',NOW(),NOW()); SELECT LAST_INSERT_ID()`,
)[0][0];
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${P1}','rantaukermas',2683,'Uji Cancel 1',100000,'IDR','transfer',CURDATE(),'',0,1,'${INVOICE}','2029-09-27',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,certnum,invoice,tgl_exp,created_at,updated_at) VALUES ('${P2}','rantaukermas',2683,'Uji Cancel 2',100000,'IDR','transfer',CURDATE(),'',0,3,'E2E/CANCEL/2026','${INVOICE}','2029-09-27',NOW(),NOW())`,
);
assert(Boolean(KONF_ID), `confirmation dummy (id ${KONF_ID}) + 2 baris adopsi (proses 1 & 3)`);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2683, name: "Petugas E2E", role: "ADMIN", level: 2 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

// ============== 1. Tombol: tampil di proses≠3, tersembunyi di Selesai ==============
await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
const kartu1 = page.locator("main .rounded-2xl", { hasText: P1 }).first();
await kartu1.waitFor({ timeout: 30000 });
assert(
  (await kartu1.getByRole("button", { name: "Batalkan Order" }).count()) === 1,
  `kartu ${P1} (proses 1) punya tombol Batalkan Order`,
);
const kartu2 = page.locator("main .rounded-2xl", { hasText: P2 }).first();
assert(
  (await kartu2.getByRole("button", { name: "Batalkan Order" }).count()) === 0,
  `kartu ${P2} (Selesai) TANPA tombol batal`,
);

// ============== 2. Modal konfirmasi: jalur aman dulu ==============
await kartu1.getByRole("button", { name: "Batalkan Order" }).click();
const modal = page.locator("[role='dialog'][aria-label='Konfirmasi pembatalan order']");
await modal.waitFor({ timeout: 10000 });
assert(
  (await modal.getByRole("heading", { name: "Batalkan order ini?" }).count()) === 1,
  "modal konfirmasi tampil dengan judul",
);
assert(
  (await modal.locator(`text=${INVOICE}`).count()) >= 1,
  "modal menampilkan kode invoice",
);
assert(
  (await modal.getByText("bisa diadopsi donor lain").count()) === 1,
  "modal menjelaskan pohon dikembalikan ke tersedia",
);
fs.mkdirSync("screenshots", { recursive: true });
await modal.screenshot({ path: "screenshots/cancel-modal.png" });
await modal.getByRole("button", { name: "Tidak, Kembali" }).click();
await modal.waitFor({ state: "hidden", timeout: 5000 });
assert(
  rows(`SELECT id FROM confirmation WHERE id=${KONF_ID} AND confirmation='yes'`).length === 1,
  "tombol Tidak menutup modal TANPA membatalkan order",
);

// ============== 3. Cancel via UI ==============
await kartu1.getByRole("button", { name: "Batalkan Order" }).click();
await modal.waitFor({ timeout: 10000 });
await modal.getByRole("button", { name: "Ya, Batalkan Order" }).click();
await page.locator("text=/Order dibatalkan/").waitFor({ timeout: 30000 });
assert(true, "banner sukses pembatalan tampil");

// ============== 3. Verifikasi DB ==============
const [konf] = rows(
  `SELECT confirmation, IFNULL(confirmationBy,'') FROM confirmation WHERE id=${KONF_ID}`,
);
assert(konf[0] === "cancel", `confirmation → cancel (oleh ${konf[1]})`);
assert(rows(`SELECT id FROM data_adopsi WHERE invoice='${INVOICE}'`).length === 0, "semua baris data_adopsi invoice terhapus");
for (const p of [P1, P2]) {
  const [st] = rows(
    `SELECT adopted, IFNULL(pengasuh,'NULL'), IFNULL(invoice,'NULL') FROM data_pohon WHERE idpohon='${p}'`,
  );
  assert(
    st[0] === "available" && st[1] === "NULL" && st[2] === "NULL",
    `${p} → available & bersih (pengasuh=${st[1]}, invoice=${st[2]})`,
  );
}
assert(
  rows(`SELECT id FROM pesan_notif WHERE idmember=2683 AND pesan LIKE '%canceled%'`).length === 1,
  "donatur menerima pesan notifikasi pembatalan",
);

// ============== 4. Kartu hilang dari daftar ==============
await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
assert(
  (await page.locator("main .rounded-2xl", { hasText: INVOICE }).count()) === 0,
  "order tercancel tak lagi tampil di daftar tagging",
);

// ============== Cleanup (pulihkan state pohon asli) ==============
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM pesan_notif WHERE idmember=2683 AND pesan LIKE '%canceled%'`);
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
console.log("=== SEMUA TES CANCEL ORDER TAGGING LULUS ===");
