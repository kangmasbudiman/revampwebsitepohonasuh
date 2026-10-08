// E2E sinkronisasi pencatatan tagging ↔ print papan (/admin/tagging):
// pohon yang SUDAH ditagging (punya foto pada siklus order ini, atau proses
// selesai) tidak lagi menampilkan checkbox papan — diganti chip "Sudah
// ditagging" — dan otomatis digugurkan dari seleksi unduh massal, termasuk
// seleksi basi yang diconteng SEBELUM foto diunggah. Foto siklus adopsi LAMA
// (idadopsi 0) TIDAK menganggap pohon sudah ditagging. Tombol "Papan Taging"
// satuan tetap tersedia untuk cetak ulang.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/papan-sync-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
const LARAVEL_PUBLIC = "/opt/homebrew/var/www/restApiPohonasuh/public";
const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

const one = (sql) => rows(sql)[0]?.[0] ?? "";

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};

// ================= Fixture: 3 order (tanpa foto / ber-foto / selesai) =================
const POHON1 = "A168"; // tanpa foto → checkbox
const POHON2 = "A106"; // ber-foto siklus ini → chip
const POHON3 = one(
  "SELECT idpohon FROM data_pohon WHERE desa='rantaukermas' AND idpohon NOT IN ('A168','A106') ORDER BY id LIMIT 1",
);
assert(Boolean(POHON3), `pohon ke-3 fixture tersedia (${POHON3})`);

rows(`DELETE FROM foto_tagging WHERE urlGambar LIKE '%papansync-e2e%'`);
rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'PAPAN-S%'`);
rows(`DELETE FROM confirmation WHERE invoice LIKE 'PAPAN-S%'`);

const buat = (inv, kode, proses) => {
  rows(
    `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${inv}',CURDATE(),2683,'E2E Sync','sync@e2e.test','transfer','IDR',100000,CURDATE(),1,'yes','E2E',NOW(),NOW())`,
  );
  rows(
    `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${kode}','rantaukermas',2683,'Uji Sync ${inv}',100000,'IDR','transfer',CURDATE(),'',0,${proses},'${inv}','2029-09-26',NOW(),NOW())`,
  );
  return one(`SELECT id FROM data_adopsi WHERE invoice='${inv}'`);
};
const ID1 = buat("PAPAN-S1", POHON1, 2);
const ID2 = buat("PAPAN-S2", POHON2, 2);
const ID3 = buat("PAPAN-S3", POHON3, 3);
assert(Boolean(ID1 && ID2 && ID3), `3 order fixture: ${ID1} (proses 2), ${ID2} (proses 2), ${ID3} (proses 3)`);

// File foto nyata (next/image menge-fetch upstream — 404 = crash render).
const srcFoto = fs
  .readdirSync(path.join(LARAVEL_PUBLIC, "upload/taging"))
  .find((f) => /\.(png|jpe?g)$/i.test(f));
assert(Boolean(srcFoto), "ada file foto taging asli untuk disalin");
for (const n of [1, 2, 3]) {
  fs.copyFileSync(
    path.join(LARAVEL_PUBLIC, "upload/taging", srcFoto),
    path.join(LARAVEL_PUBLIC, "upload/taging", `papansync-e2e-${n}.png`),
  );
}

// Foto siklus order S2 (idadopsi = ID2) + foto LEGACY di POHON1 (idadopsi 0)
rows(
  `INSERT INTO foto_tagging (idpohon,tanggal,idmember,idadopsi,urlGambar) VALUES ('${POHON2}',CURDATE(),2683,${ID2},'${API.replace("/api", "")}/upload/taging/papansync-e2e-1.png')`,
);
rows(
  `INSERT INTO foto_tagging (idpohon,tanggal,idmember,idadopsi,urlGambar) VALUES ('${POHON1}',CURDATE(),2683,0,'${API.replace("/api", "")}/upload/taging/papansync-e2e-2.png')`,
);
assert(Number(one(`SELECT COUNT(*) FROM foto_tagging WHERE urlGambar LIKE '%papansync-e2e%'`)) === 2, "2 foto fixture terpasang (1 siklus ini + 1 legacy)");

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
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

// ================= 1. Kartu tanpa foto → checkbox (foto legacy diabaikan) =================
await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
const kartu1 = page.locator("main .rounded-2xl", { hasText: "PAPAN-S1" }).first();
await kartu1.waitFor({ timeout: 30000 });
assert(
  (await kartu1.locator(`input[aria-label="Tandai papan ${POHON1}"]`).count()) === 1,
  `${POHON1} (tanpa foto siklus ini, ada foto LEGACY) tetap menampilkan checkbox papan`,
);
assert((await kartu1.getByTestId("chip-sudah-tagging").count()) === 0, `${POHON1} tanpa chip sudah-ditagging`);

// ================= 2. Kartu ber-foto → chip, tanpa checkbox, tombol satuan tetap =================
const kartu2 = page.locator("main .rounded-2xl", { hasText: "PAPAN-S2" }).first();
await kartu2.waitFor({ timeout: 10000 });
assert(
  (await kartu2.locator(`input[aria-label="Tandai papan ${POHON2}"]`).count()) === 0,
  `${POHON2} (1 foto siklus ini) TANPA checkbox papan`,
);
const chip2 = kartu2.getByTestId("chip-sudah-tagging");
assert((await chip2.count()) === 1, `chip sudah-ditagging tampil di ${POHON2}`);
assert((await chip2.innerText()).includes("Sudah ditagging (1 foto)"), "chip menyebut jumlah foto: " + (await chip2.innerText()));
assert(
  (await kartu2.getByRole("link", { name: "Papan Taging" }).count()) === 1,
  "tombol Papan Taging satuan tetap tersedia (cetak ulang)",
);

// ================= 3. Kartu proses Selesai tanpa foto → chip tanpa hitungan =================
const kartu3 = page.locator("main .rounded-2xl", { hasText: "PAPAN-S3" }).first();
await kartu3.waitFor({ timeout: 10000 });
assert(
  (await kartu3.locator(`input[aria-label="Tandai papan ${POHON3}"]`).count()) === 0,
  `${POHON3} (proses Selesai) TANPA checkbox papan`,
);
assert(
  (await kartu3.getByText("Sudah ditagging", { exact: true }).count()) === 1,
  `${POHON3} chip "Sudah ditagging" tanpa hitungan foto`,
);

// ================= 4. Seleksi massal: conteng S1 → bar muncul; foto masuk → digugurkan =================
await kartu1.locator(`label:has(input[aria-label="Tandai papan ${POHON1}"])`).first().click();
const bar = page.getByTestId("unduh-papan-batch");
await bar.waitFor({ timeout: 10000 });
assert((await bar.textContent()).includes("Download Papan Taging (1)"), "bar unduh menghitung 1 pohon (S1)");

// Simulasikan petugas mengunggah foto utk S1 (DB-side) lalu refresh tanpa
// reload penuh (server action catatan order) — seleksi S1 kini basi.
rows(
  `INSERT INTO foto_tagging (idpohon,tanggal,idmember,idadopsi,urlGambar) VALUES ('${POHON1}',CURDATE(),2683,${ID1},'${API.replace("/api", "")}/upload/taging/papansync-e2e-3.png')`,
);
await kartu1.getByRole("button", { name: "Simpan Catatan" }).click();
await kartu1.getByTestId("chip-sudah-tagging").waitFor({ timeout: 15000 });
assert(true, "setelah foto tercatat, kartu S1 berganti chip sudah-ditagging (tanpa reload penuh)");
await page.waitForTimeout(500);
assert(
  (await page.getByTestId("unduh-papan-batch").count()) === 0,
  "seleksi basi S1 otomatis digugurkan dari bar unduh massal",
);

// ================= Cleanup =================
rows(`DELETE FROM foto_tagging WHERE urlGambar LIKE '%papansync-e2e%'`);
rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'PAPAN-S%'`);
rows(`DELETE FROM confirmation WHERE invoice LIKE 'PAPAN-S%'`);
for (const n of [1, 2, 3]) {
  try { fs.unlinkSync(path.join(LARAVEL_PUBLIC, "upload/taging", `papansync-e2e-${n}.png`)); } catch {}
}
await browser.close();
console.log("\n=== SEMUA TES SINKRONISASI TAGGING-PRINT LULUS ===");
