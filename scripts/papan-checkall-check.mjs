// E2E "Conteng Semua" (petugas) di /admin/tagging: sekali klik menandai
// SEMUA pohon yang akan diproses (belum ditagging) pada tampilan/tab aktif —
// checkbox per kartu ikut tercentang & bar unduh massal menghitung jumlahnya.
// Tab aktif dihormati; admin TIDAK melihat tombol ini.
import { chromium } from "playwright";
import { SignJWT } from "jose";
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

const INVOICE = "CHKALL-E2E";

// ============== Fixture: 3 order (2 Baru + 1 Diproses tanpa foto) ==============
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);

const POHONS = rows(
  "SELECT idpohon, IFNULL(adopted,''), IFNULL(pengasuh,''), IFNULL(nama,''), IFNULL(invoice,''), IFNULL(tgl_adopt,''), 'x' FROM data_pohon WHERE desa='rantaukermas' AND adopted='available' ORDER BY id LIMIT 3",
).map((r) => r.slice(0, 6));
assert(POHONS.length === 3, `3 pohon fixture available rantaukermas (${POHONS.map((p) => p[0]).join(", ")})`);
for (const [kode] of POHONS) {
  rows(
    `UPDATE data_pohon SET adopted='reserved', pengasuh=2683, nama='Uji Checkall', invoice='${INVOICE}', tgl_adopt=CURDATE() WHERE idpohon='${kode}'`,
  );
}
rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),2683,'E2E Checkall','e2e@checkall.test','transfer','IDR',300000,CURDATE(),3,'yes','E2E',NOW(),NOW())`,
);
// P1,P2 proses=1 (Baru); P3 proses=2 TANPA foto (tetap bisa diconteng)
for (const [i, [kode]] of POHONS.entries()) {
  rows(
    `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${kode}','rantaukermas',2683,'Uji Checkall ${i + 1}',100000,'IDR','transfer',CURDATE(),'',0,${i < 2 ? 1 : 2},'${INVOICE}','2029-09-27',NOW(),NOW())`,
  );
}
const P1 = POHONS[0][0];
const P3 = POHONS[2][0];
assert(true, `fixture: ${POHONS[0][0]},${POHONS[1][0]} proses=1 + ${P3} proses=2 tanpa foto`);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const tokenPetugas = await new SignJWT({ userId: 2683, name: "Petugas E2E", role: "ADMIN", level: 2 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const tokenAdmin = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const browser = await chromium.launch();
const boxes = 'input[aria-label^="Tandai papan"]';

// ============== 1. Petugas: conteng semua di tampilan Semua ==============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: tokenPetugas, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
  await page.locator(boxes).first().waitFor({ timeout: 30000 });

  const btn = page.locator("[data-testid='conteng-semua']");
  assert((await btn.count()) === 1, "PETUGAS: tombol Conteng Semua tampil");
  const nCb = await page.locator(boxes).count();
  assert(nCb >= 3, `${nCb} kartu punya checkbox papan (≥3 fixture)`);
  assert(
    (await btn.textContent()).includes(`(${nCb})`),
    `label tombol menghitung semua papan yang bisa diconteng (${nCb})`,
  );

  await btn.click();
  await page.waitForTimeout(300);
  const nChecked = await page.locator(`${boxes}:checked`).count();
  assert(nChecked === nCb, `sekali klik: SEMUA ${nChecked}/${nCb} checkbox tercentang`);
  const bar = page.locator("[data-testid='unduh-papan-batch']");
  assert((await bar.count()) === 1, "bar unduh massal muncul");
  assert(
    (await page.locator("text=/pohon dipilih untuk papan taging/").first().textContent()).includes(String(nCb)),
    `bar menghitung ${nCb} pohon dipilih`,
  );
  fs.mkdirSync("screenshots", { recursive: true });
  await page.screenshot({ path: "screenshots/checkall-petugas.png" });

  // Kosongkan via toggle "Hilangkan Semua", lalu conteng lagi via toggle
  const btnToggle = page.locator("[data-testid='conteng-semua']");
  assert(
    (await btnToggle.getAttribute("aria-label")) === "Hilangkan semua centang",
    "semua tercentang: tombol berubah jadi Hilangkan Semua",
  );
  assert((await btnToggle.textContent()).includes("Hilangkan Semua"), "label tombol: Hilangkan Semua");
  await btnToggle.click();
  await page.waitForTimeout(300);
  assert((await page.locator(`${boxes}:checked`).count()) === 0, "klik Hilangkan Semua: SEMUA centang hilang");
  assert(
    (await page.locator("[data-testid='conteng-semua']").getAttribute("aria-label")) === "Conteng semua papan",
    "kosong: tombol kembali jadi Conteng Semua",
  );
  await page.locator("[data-testid='conteng-semua']").click();
  await page.waitForTimeout(300);
  assert(
    (await page.locator(`${boxes}:checked`).count()) === nCb,
    `toggle bolak-balik: ${nCb} tercentang lagi`,
  );

  // Kosongkan via tombol bar
  await page.getByRole("button", { name: "Kosongkan pilihan papan" }).click();
  await page.waitForTimeout(300);
  assert((await page.locator(`${boxes}:checked`).count()) === 0, "Kosongkan (bar) menghapus semua centang");

  // Tab aktif dihormati: di tab Baru hanya papan proses=1 yang diconteng
  await page.goto(`${BASE}/admin/tagging?proses=1`, { waitUntil: "networkidle" });
  await page.locator(boxes).first().waitFor({ timeout: 30000 });
  const nBaru = await page.locator(boxes).count();
  assert(nBaru >= 2, `tab Baru menampilkan ${nBaru} checkbox`);
  await page.locator("[data-testid='conteng-semua']").click();
  await page.waitForTimeout(300);
  assert(
    (await page.locator(`${boxes}:checked`).count()) === nBaru,
    `tab Baru: hanya ${nBaru} papan Baru tercentang`,
  );
  await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const kartuP3 = page.locator("main .rounded-2xl", { hasText: P3 }).first();
  assert(
    (await kartuP3.locator(boxes).isChecked()) === false,
    `${P3} (Diproses, di luar tab Baru saat diconteng) TIDAK ikut tercentang`,
  );
  await page.getByRole("button", { name: "Kosongkan pilihan papan" }).click().catch(() => {});
  await ctx.close();
}

// ============== 2. Admin: tombol tak tersedia ==============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: tokenAdmin, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
  await page.locator(boxes).first().waitFor({ timeout: 30000 });
  assert(
    (await page.locator("[data-testid='conteng-semua']").count()) === 0,
    "ADMIN: tombol Conteng Semua TIDAK tampil (khusus petugas)",
  );
  await ctx.close();
}

// ============== Cleanup ==============
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
console.log("=== SEMUA TES CONTENG SEMUA PETUGAS LULUS ===");
