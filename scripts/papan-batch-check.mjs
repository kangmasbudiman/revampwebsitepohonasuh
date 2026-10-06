// E2E fitur "unduh massal papan taging" (/admin/tagging): conteng beberapa
// kartu order → tombol Download Papan Taging → satu file ZIP berisi PNG
// papan per pohon (2382×1684, render html-to-image dari komponen PapanTaging
// yang sama dengan halaman pratinjau). Login petugas level 2 dengan 2 order
// dummy di rantaukermas; fixture dibersihkan di awal & akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";
import JSZip from "jszip";

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

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2683, name: "Petugas E2E", role: "ADMIN", level: 2 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

// ================= Fixture (2 order dummy = 2 kartu) =================
const POHON = ["A168", "A106"];
rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'PAPAN-B%'`);
rows(`DELETE FROM confirmation WHERE invoice LIKE 'PAPAN-B%'`);
const infoPohon = Object.fromEntries(
  rows(
    `SELECT data_pohon.idpohon, data_pohon.localname, IFNULL(desa.kecamatan,''), IFNULL(desa.kabupaten,''), IFNULL(desa.provinsi,'') FROM data_pohon JOIN desa ON desa.nama=data_pohon.desa WHERE data_pohon.idpohon IN (${POHON.map((p) => `'${p}'`).join(",")}) AND data_pohon.desa='rantaukermas'`,
  ).map((r) => [r[0], r]),
);
assert(Boolean(infoPohon.A168 && infoPohon.A106), "pohon fixture A168 + A106 ada di rantaukermas");

for (const [i, kode] of POHON.entries()) {
  const inv = `PAPAN-B${i + 1}`;
  rows(
    `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${inv}',CURDATE(),2683,'E2E Batch','e2e@batch.test','transfer','IDR',100000,CURDATE(),1,'yes','E2E',NOW(),NOW())`,
  );
  rows(
    `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${kode}','rantaukermas',2683,'Uji Batch E2E ${i + 1}',100000,'IDR','transfer',CURDATE(),'',0,1,'${inv}','2029-09-26',NOW(),NOW())`,
  );
}
const ids = Object.fromEntries(
  rows(`SELECT invoice, id FROM data_adopsi WHERE invoice LIKE 'PAPAN-B%'`).map((r) => [r[0], r[1]]),
);
assert(Object.keys(ids).length === 2, "2 order dummy tersimpan");

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

// ================= 1. Checkbox per kartu =================
await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
for (const kode of POHON) {
  await page.locator(`label:has(input[aria-label="Tandai papan ${kode}"])`).first().waitFor({ timeout: 30000 });
}
assert(true, `kartu ${POHON.join(" & ")} punya checkbox "Tandai papan"`);
assert((await page.getByTestId("unduh-papan-batch").count()) === 0, "bar unduh belum muncul saat belum ada pilihan");

// ================= 2. Conteng 2 pohon → bar aksi =================
for (const kode of POHON) {
  await page.locator(`label:has(input[aria-label="Tandai papan ${kode}"])`).first().click();
}
const bar = page.getByTestId("unduh-papan-batch");
await bar.waitFor({ timeout: 10000 });
assert((await bar.textContent()).includes("Download Papan Taging (2)"), "bar menampilkan tombol Download Papan Taging (2)");
assert((await page.locator("text=2 pohon dipilih").count()) === 1, "bar menghitung 2 pohon dipilih");

// Toggle: batalkan satu → 1, conteng lagi → 2
await page.locator(`label:has(input[aria-label="Tandai papan ${POHON[0]}"])`).first().click();
assert((await bar.textContent()).includes("Download Papan Taging (1)"), "batalkan satu conteng → hitungan jadi 1");
await page.locator(`label:has(input[aria-label="Tandai papan ${POHON[0]}"])`).first().click();
assert((await bar.textContent()).includes("Download Papan Taging (2)"), "conteng ulang → hitungan kembali 2");

// ================= 3. Download → ZIP berisi 2 PNG =================
const zipPath = "/tmp/papan-batch-e2e.zip";
try { fs.unlinkSync(zipPath); } catch {}
const waitDl = page.waitForEvent("download", { timeout: 90000 });
await bar.click();
const dl = await waitDl;
await dl.saveAs(zipPath);
assert((await dl.suggestedFilename()).startsWith("papan-taging-") && (await dl.suggestedFilename()).endsWith(".zip"),
  `file terunduh: ${await dl.suggestedFilename()}`);

const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
const entries = Object.values(zip.files).filter((f) => !f.dir);
assert(entries.length === 2, `ZIP berisi 2 file (nyata: ${entries.length})`);
for (const f of entries) {
  assert(/^papan-(A168|A106)-\d+\.png$/.test(f.name), `nama file bermakna: ${f.name}`);
}
// Validasi isi PNG: magic + dimensi IHDR (2382×1684) + ukuran (template bertekstur).
for (const f of entries) {
  const buf = await f.async("nodebuffer");
  assert(buf.length > 100_000, `${f.name} berukuran wajar (${(buf.length / 1024).toFixed(0)} KB)`);
  assert(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47, `${f.name} magic PNG benar`);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  assert(w === 2382 && h === 1684, `${f.name} dimensi cetak 2382×1684 (nyata ${w}×${h})`);
}

// ================= 4. Kosongkan pilihan =================
await page.getByRole("button", { name: "Kosongkan pilihan papan" }).click();
await page.waitForTimeout(300);
assert((await page.getByTestId("unduh-papan-batch").count()) === 0, "Kosongkan → bar menghilang");

await page.screenshot({ path: "screenshots/papan-batch-selesai.png", fullPage: false });
console.log("\nSELESAI — semua asersi lulus.");

// ================= Cleanup =================
rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'PAPAN-B%'`);
rows(`DELETE FROM confirmation WHERE invoice LIKE 'PAPAN-B%'`);
await browser.close();
if (!process.env.KEEP_ZIP) {
  try { fs.unlinkSync(zipPath); } catch {}
}
