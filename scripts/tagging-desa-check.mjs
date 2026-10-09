// E2E filter desa di Order Tagging: admin level 1 melihat order SEMUA desa
// (param `semua`) + dropdown filter desa; petugas tetap hanya desa tugasnya
// dan tanpa filter. Fixture order dibuat di desa non-penugasan lalu dibersihkan.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/tagging-desa-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
const INV = "TAGDES-E2E";

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

// ================= Fixture: bersihkan sisa + order di desa lain =================
rows(`DELETE FROM pembayaran_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice='${INV}')`);
rows(`DELETE FROM foto_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice='${INV}')`);
rows(`DELETE FROM data_adopsi WHERE invoice='${INV}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INV}'`);

const [desaLain, pohonLain] = rows(
  `SELECT p.desa, p.idpohon FROM data_pohon p WHERE p.adopted='available' AND p.desa IS NOT NULL AND p.desa <> 'rantaukermas' AND p.desa <> '' ORDER BY p.id LIMIT 1`,
)[0] ?? [];
assert(!!desaLain && !!pohonLain, `pohon available di desa non-rantaukermas ditemukan (${pohonLain} @ ${desaLain})`);
const kecamatanLain = one(`SELECT IFNULL(kecamatan,'') FROM desa WHERE nama='${desaLain}'`);

const marker = one(
  `SELECT a.invoice FROM data_adopsi a JOIN confirmation c ON c.invoice=a.invoice WHERE c.confirmation='yes' AND a.desa='rantaukermas' AND a.proses IN (1,2,3) ORDER BY a.id DESC LIMIT 1`,
);
assert(!!marker, "ada order rantaukermas terverifikasi sebagai penanda");

rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,created_at,updated_at) VALUES ('${INV}',CURDATE(),2681,'E2E Desa','e2e@pohon.asuh','Transfer','IDR',200000,CURDATE(),1,'yes',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,gfrom,certnum,dur,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${pohonLain}','${desaLain}',2681,'E2E Desa',200000,'IDR','Transfer',CURDATE(),0,NULL,1,'',0,1,'${INV}',DATE_ADD(CURDATE(), INTERVAL 1 YEAR),NOW(),NOW())`,
);
const ida = Number(one(`SELECT id FROM data_adopsi WHERE invoice='${INV}'`));
assert(ida > 0, `fixture order ${INV} terpasang di desa ${desaLain} (data_adopsi ${ida})`);

// ================= 1. API: param `semua` =================
const apiRows = async (body) =>
  (await (await fetch(`${API}/ordercustomerbypengurus`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })).json());
const tanpaSemua = await apiRows(`iduser=2682`);
assert(!tanpaSemua.some((r) => r.invoice === INV), "API tanpa `semua`: order desa lain TIDAK ikut (perilaku lama)");
const denganSemua = await apiRows(`iduser=2682&semua=1`);
const rowFixture = denganSemua.find((r) => r.invoice === INV);
assert(!!rowFixture, "API dengan `semua=1`: order desa lain ikut (admin)");
assert(rowFixture && String(rowFixture.kecamatan ?? "") === kecamatanLain, `kecamatan tetap terisi utk desa di luar penugasan ("${rowFixture?.kecamatan}")`);

// ================= 2. UI admin: daftar semua desa + filter =================
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const sign = (p) =>
  new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

const browser = await chromium.launch();
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await adminCtx.addCookies([{ name: "pa_session", value: await sign({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE }]);
const a = await adminCtx.newPage();

await a.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
await a.getByRole("heading", { name: "Order Tagging", exact: true }).waitFor({ timeout: 30000 });
assert((await a.getByText(INV).count()) >= 1, "admin: order desa lain tampil di daftar");
assert((await a.getByText(marker).count()) >= 1, "admin: order rantaukermas tetap tampil");

const sel = a.locator('select[aria-label="Filter desa"]');
await sel.waitFor({ timeout: 10000 });
const options = await sel.locator("option").allTextContents();
// label opsi kini Title Case (namaDesa) — bandingkan case-insensitive
const lower = options.map((o) => o.toLowerCase());
assert(lower.includes("semua desa") && lower.includes(desaLain.toLowerCase()) && lower.includes("rantaukermas"),
  `dropdown filter memuat semua desa (${options.join(", ")})`);

await sel.selectOption(desaLain);
await a.waitForURL(`**/admin/tagging?desa=${encodeURIComponent(desaLain)}`);
await a.waitForTimeout(800);
assert((await a.getByText(marker).count()) === 0, `filter ${desaLain}: order rantaukermas hilang`);
assert((await a.getByText(INV).count()) >= 1, `filter ${desaLain}: order desa lain tetap tampil`);

// filter desa + proses dipertahankan bersama
await a.getByRole("link", { name: /Baru \(\d+\)/ }).click();
await a.waitForURL(`**/admin/tagging?proses=1&desa=${encodeURIComponent(desaLain)}`);
assert((await a.getByText(INV).count()) >= 1, "filter proses dipertahankan bersama filter desa");

await sel.selectOption("");
await a.waitForURL("**/admin/tagging?proses=1");
await a.waitForTimeout(800);
assert((await a.getByText(INV).count()) >= 1, "kembali ke Semua desa: order desa lain tampil kembali");
// tab "Semua" membawa URL bersih tanpa filter
await a.getByRole("link", { name: /^Semua \(\d+\)$/ }).click();
await a.waitForURL("**/admin/tagging");
await a.waitForTimeout(800);
assert((await a.getByText(marker).count()) >= 1, "tanpa filter: semua order tampil");

// ================= 3. UI petugas: tetap desa tugas, tanpa filter =================
const petugasCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await petugasCtx.addCookies([{ name: "pa_session", value: await sign({ userId: 2683, name: "Petugas Taging Rantaukremas", role: "ADMIN", level: 2 }), url: BASE }]);
const p = await petugasCtx.newPage();
await p.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
await p.getByRole("heading", { name: "Order Tagging", exact: true }).waitFor({ timeout: 30000 });
assert((await p.getByText(INV).count()) === 0, "petugas: order desa lain TIDAK tampil (dibatasi desa tugas)");
assert((await p.locator('select[aria-label="Filter desa"]').count()) === 0, "petugas: dropdown filter desa tidak muncul");
assert((await p.getByText(marker).count()) >= 1, "petugas: order rantaukermas tetap tampil");

// ================= Cleanup =================
rows(`DELETE FROM data_adopsi WHERE invoice='${INV}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INV}'`);
await browser.close();
console.log("\n=== SEMUA TES FILTER DESA ORDER TAGGING LULUS ===");
