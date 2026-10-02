// E2E Notifikasi member: halaman /dashboard/notifikasi + dropdown lonceng.
//   1. Guard: tanpa login → redirect /masuk
//   2. Halaman: daftar pesan, klik pesan noread → status read di DB + chip BARU hilang
//   3. Hapus: modal konfirmasi (jalur aman batal → tetap ada; jalur hapus → hilang di DB)
//   4. Dropdown lonceng: badge unread, hapus per item (badge berkurang), link lihat semua
//   5. Pesan lama (status read) tidak berubah perilakunya saat diklik
//   6. Lonceng ADMIN (panel /admin): hapus per item + link lihat semua
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

const tunggu = async (fn, msg, timeout = 10000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timeout menunggu: ${msg}`);
};

// ============== Fixture ==============
for (const id of rows(`SELECT id FROM member WHERE emaile LIKE 'e2e_notif_%'`).map((r) => r[0])) {
  rows(`DELETE FROM pesan_notif WHERE idmember=${id}`);
  rows(`DELETE FROM data_basket WHERE id_member=${id}`);
  rows(`DELETE FROM confirmation WHERE idpengasuh=${id}`);
  rows(`DELETE FROM member WHERE id=${id}`);
}
// fixture pesan admin (member asli 2682 — hanya baris E2E yang disentuh)
rows(`DELETE FROM pesan_notif WHERE idmember=2682 AND pesan LIKE 'E2E notif admin%'`);

const browser = await chromium.launch();
const email = `e2e_notif_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Notif Tester");
await page.fill("#email", email);
await page.fill("#phone", "081234567890");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!MEMBER_ID, `member terbuat id=${MEMBER_ID}`);

const insPesan = (pesan, status) =>
  rows(
    `INSERT INTO pesan_notif (idmember,pesan,status) VALUES (${MEMBER_ID},'${pesan}','${status}')`,
  );
insPesan("E2E pesan pertama belum dibaca", "noread"); // P1
insPesan("E2E pesan kedua akan dihapus", "noread"); // P2
insPesan("E2E pesan ketiga sudah dibaca", "read"); // P3
assert(
  rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "3",
  "3 pesan fixture terpasang",
);

// ============== 1. Guard tanpa login ==============
const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const anonPage = await anon.newPage();
await anonPage.goto(`${BASE}/dashboard/notifikasi`, { waitUntil: "domcontentloaded" });
await anonPage.waitForURL(/\/masuk/, { timeout: 15000 });
assert(true, "tanpa login → dialihkan ke /masuk");
await anon.close();

// sesi member
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: Number(MEMBER_ID), name: "E2E Notif Tester", role: "USER" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);

// ============== 2. Halaman notifikasi: tandai dibaca ==============
await page.goto(`${BASE}/dashboard/notifikasi`, { waitUntil: "networkidle" });
await page.waitForSelector("text=E2E pesan pertama belum dibaca", { timeout: 15000 });
assert(true, "halaman /dashboard/notifikasi memuat daftar pesan");
assert(
  (await page.getByText("2 notifikasi belum dibaca").count()) === 1,
  "counter header: 2 belum dibaca",
);
assert((await page.getByText("BARU", { exact: true }).count()) === 2, "chip BARU = 2");

// klik pesan P1 (noread) → tandai dibaca
const kartu1 = page.locator("div", { hasText: "E2E pesan pertama belum dibaca" }).filter({
  has: page.getByText("BARU", { exact: true }),
}).first();
await kartu1.click();
const P1_ID = rows(
  `SELECT id FROM pesan_notif WHERE idmember=${MEMBER_ID} AND pesan LIKE '%pertama%'`,
)[0][0];
await tunggu(
  () => rows(`SELECT status FROM pesan_notif WHERE id=${P1_ID}`)[0][0] === "read",
  "status P1 jadi read di DB",
);
assert(true, "klik pesan belum-dibaca → status read di DB");
assert(
  (await page.getByText("BARU", { exact: true }).count()) === 1,
  "chip BARU tersisa 1 (optimis + refresh)",
);

// pesan sudah-read diklik → tidak berubah apa pun (bukan noread)
const kartu3 = page.locator("text=E2E pesan ketiga sudah dibaca");
await kartu3.click();
await page.waitForTimeout(400);
assert(
  rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "3",
  "klik pesan sudah-dibaca tidak menghapus/mengubah apa pun",
);

// ============== 3. Hapus via modal (jalur aman lalu jalur hapus) ==============
const P2_ID = rows(
  `SELECT id FROM pesan_notif WHERE idmember=${MEMBER_ID} AND pesan LIKE '%kedua%'`,
)[0][0];
const tombolHapus2 = page.locator(`button[aria-label="Hapus notifikasi ${P2_ID}"]`);
await tombolHapus2.click();
await page.waitForSelector("text=Hapus notifikasi?", { timeout: 5000 });
assert(true, "modal konfirmasi hapus tampil");
await page.getByRole("button", { name: "Tidak, Kembali" }).click();
await page.waitForSelector("text=Hapus notifikasi?", { state: "detached", timeout: 5000 });
assert(
  rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "3",
  "jalur aman (batal) → pesan TIDAK terhapus",
);
await tombolHapus2.click();
await page.getByRole("button", { name: "Ya, Hapus" }).click();
await tunggu(
  () => rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "2",
  "P2 terhapus dari DB",
);
assert(true, "'Ya, Hapus' → pesan terhapus dari DB & kartu hilang");
assert(
  (await page.locator("text=E2E pesan kedua akan dihapus").count()) === 0,
  "kartu pesan terhapus hilang dari daftar",
);

// ============== 3b. Hapus SEMUA notifikasi ==============
await page.getByRole("button", { name: "Hapus Semua", exact: true }).click();
await page.waitForSelector("text=Hapus semua notifikasi?", { timeout: 5000 });
assert(
  (await page.getByText("2 notifikasi akan dihapus.").count()) === 1,
  "modal hapus-semua menyebut jumlah pesan",
);
await page.getByRole("button", { name: "Tidak, Kembali" }).click();
await page.waitForSelector("text=Hapus semua notifikasi?", { state: "detached", timeout: 5000 });
assert(
  rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "2",
  "jalur aman hapus-semua (batal) → tidak ada yang terhapus",
);
await page.getByRole("button", { name: "Hapus Semua", exact: true }).click();
await page.getByRole("button", { name: "Ya, Hapus Semua" }).click();
await tunggu(
  () => rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0] === "0",
  "semua pesan terhapus dari DB",
);
assert(true, "'Ya, Hapus Semua' → seluruh pesan hilang dari DB");
await page.waitForSelector("text=Belum ada notifikasi", { timeout: 10000 });
assert(true, "empty state tampil setelah semua notifikasi terhapus");

// ============== 4. Dropdown lonceng ==============
rows(`INSERT INTO pesan_notif (idmember,pesan,status) VALUES (${MEMBER_ID},'E2E pesan keempat via lonceng','noread')`);
const P4_ID = rows(
  `SELECT id FROM pesan_notif WHERE idmember=${MEMBER_ID} AND pesan LIKE '%keempat%'`,
)[0][0];

await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
const lonceng = page.locator('header button[aria-label="Notifikasi"]').first();
await lonceng.locator("span", { hasText: /\d/ }).first().waitFor({ timeout: 10000 });
assert(true, "badge unread tampil di lonceng header");
await lonceng.click();
await page.waitForSelector("text=E2E pesan keempat via lonceng", { timeout: 10000 });
assert(true, "dropdown lonceng menampilkan pesan terbaru");

// hapus P4 (noread) dari dropdown → badge hilang (unread 0)
await page.locator(`button[aria-label="Hapus notifikasi ${P4_ID}"]`).click();
await tunggu(
  () => rows(`SELECT COUNT(*) FROM pesan_notif WHERE id=${P4_ID}`)[0][0] === "0",
  "P4 terhapus via dropdown",
);
assert(true, "tombol hapus per item di dropdown bekerja (DB terhapus)");
await page.waitForTimeout(600);
assert(
  (await lonceng.locator("span", { hasText: /\d/ }).count()) === 0,
  "badge unread lenyap setelah pesan noread dihapus",
);

// link lihat semua
await page.getByRole("link", { name: /Lihat semua notifikasi/ }).click();
await page.waitForURL("**/dashboard/notifikasi", { timeout: 10000 });
await page.waitForSelector("text=Belum ada notifikasi", { timeout: 10000 });
assert(true, "link 'Lihat semua notifikasi' → /dashboard/notifikasi (daftar kosong sesuai DB)");

// ============== 5. Isolasi antar user ==============
// Notifikasi WAJIB berdasar user login: pesan milik akun lain tak boleh
// muncul — baik di halaman /dashboard/notifikasi maupun dropdown lonceng.
const RAHASIA_B = `E2E notif admin rahasia ${Date.now()}`; // milik 2682, dibersihkan cleanup 'E2E notif admin%'
rows(`INSERT INTO pesan_notif (idmember,pesan,status) VALUES (${MEMBER_ID},'E2E pesan isolasi milik A','noread')`);
rows(`INSERT INTO pesan_notif (idmember,pesan,status) VALUES (2682,'${RAHASIA_B}','noread')`);
await page.goto(`${BASE}/dashboard/notifikasi`, { waitUntil: "networkidle" });
await page.waitForSelector("text=E2E pesan isolasi milik A", { timeout: 10000 });
assert((await page.getByText(RAHASIA_B).count()) === 0, "halaman notifikasi A TIDAK memuat pesan user lain (2682)");
const jmlMilikA = Number(rows(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER_ID}`)[0][0]);
assert(
  (await page.locator('button[aria-label^="Hapus notifikasi"]').count()) === jmlMilikA,
  `jumlah kartu = pesan milik A sendiri (${jmlMilikA}), bukan campuran`,
);
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.locator('header button[aria-label="Notifikasi"]').first().click();
await page.waitForSelector("text=E2E pesan isolasi milik A", { timeout: 10000 });
assert((await page.getByText(RAHASIA_B).count()) === 0, "dropdown lonceng A bebas pesan user lain");

// ============== 6. Lonceng ADMIN (panel /admin) ==============
const ADMIN_ID = 2682;
rows(`INSERT INTO pesan_notif (idmember,pesan,status) VALUES (${ADMIN_ID},'E2E notif admin belum dibaca','noread')`);
rows(`INSERT INTO pesan_notif (idmember,pesan,status) VALUES (${ADMIN_ID},'E2E notif admin akan dihapus','noread')`);
const PA_ID = rows(
  `SELECT id FROM pesan_notif WHERE idmember=${ADMIN_ID} AND pesan LIKE 'E2E notif admin akan dihapus'`,
)[0][0];
const adminToken = await new SignJWT({
  userId: ADMIN_ID,
  name: "Admin Pohon Asuh",
  role: "ADMIN",
  level: 1,
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

const admCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await admCtx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);
const adm = await admCtx.newPage();
await adm.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await adm.locator('button[aria-label="Notifikasi"]').first().click();
await adm.waitForSelector("text=E2E notif admin akan dihapus", { timeout: 10000 });
assert(true, "lonceng ADMIN (/admin) menampilkan pesan fixture");
assert(
  (await adm.getByText("E2E pesan isolasi milik A").count()) === 0,
  "lonceng admin TIDAK memuat pesan member A (isolasi dua arah)",
);
await adm.locator(`button[aria-label="Hapus notifikasi ${PA_ID}"]`).click();
await tunggu(
  () => rows(`SELECT COUNT(*) FROM pesan_notif WHERE id=${PA_ID}`)[0][0] === "0",
  "hapus via lonceng admin",
);
assert(true, "tombol hapus per item di lonceng admin bekerja (DB terhapus)");
assert(
  (await adm.locator("text=E2E notif admin akan dihapus").count()) === 0,
  "kartu hilang dari dropdown admin (optimis)",
);
await adm.getByRole("link", { name: /Lihat semua notifikasi/ }).click();
await adm.waitForURL("**/dashboard/notifikasi", { timeout: 10000 });
await adm.waitForSelector("text=E2E notif admin belum dibaca", { timeout: 10000 });
assert(true, "link 'Lihat semua' lonceng admin → /dashboard/notifikasi (pesan admin tampil)");
await admCtx.close();

// ============== Cleanup ==============
rows(`DELETE FROM pesan_notif WHERE idmember=${MEMBER_ID}`);
rows(`DELETE FROM data_basket WHERE id_member=${MEMBER_ID}`);
rows(`DELETE FROM confirmation WHERE idpengasuh=${MEMBER_ID}`);
rows(`DELETE FROM member WHERE id=${MEMBER_ID}`);
rows(`DELETE FROM pesan_notif WHERE idmember=2682 AND pesan LIKE 'E2E notif admin%'`);
await browser.close();
console.log("=== SEMUA TES NOTIFIKASI LULUS ===");
