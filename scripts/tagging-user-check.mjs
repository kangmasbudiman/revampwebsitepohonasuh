// E2E fitur "Progres Tagging" sisi donatur (/dashboard/adopsi/[code]):
// timeline proses per pohon (menunggu/sedang/selesai) + galeri bukti foto
// dari petugas (scoped idadopsi — riwayat foto siklus adopsi lama tidak
// ikut) + lightbox. Fixture: member daftar via UI, order 2 pohon
// (proses 2 + 3 foto tanggal beda, proses 1 tanpa foto) + 1 foto legacy
// idadopsi=0 yang TIDAK boleh tampil. Dibersihkan di awal & akhir.
import { chromium } from "playwright";
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

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const tglIndo = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
};

// ================= Fixture =================
const INVOICE = "TAGGING-E2E";
const FOTO_URL = "http://127.0.0.1:8000/assets/pohon1.jpg";

// cleanup sisa run gagal sebelumnya
rows(`DELETE FROM foto_tagging WHERE urlGambar LIKE '%?e2etag=%'`);
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM member WHERE emaile LIKE 'e2e_tagging_%'`);
// pulihkan pohon fixture dari run lalu (kalau sempat ter-reserve)
rows(`UPDATE data_pohon SET adopted='available', pengasuh=0, invoice='', tgl_adopt=NULL WHERE idpohon IN ('C114','C118') AND invoice='${INVOICE}'`);

const P1 = "C114";
const P2 = "C118";
const L1 = rows(`SELECT localname FROM data_pohon WHERE idpohon='${P1}'`)[0][0];
const DESA1 = rows(`SELECT desa FROM data_pohon WHERE idpohon='${P1}'`)[0][0];
assert(Boolean(L1), `pohon fixture ada: ${P1} (${L1}) & ${P2}`);

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();

// ===== daftar member via UI (sesi cookie asli) =====
const email = `e2e_tagging_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Tagging Tester");
await page.fill("#email", email);
await page.fill("#phone", "081234567811");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!MEMBER_ID, `member terbuat id=${MEMBER_ID}`);

// ===== order terverifikasi: P1 proses=2 (3 foto), P2 proses=1 =====
rows(`UPDATE data_pohon SET adopted='reserved', pengasuh=${MEMBER_ID}, invoice='${INVOICE}', tgl_adopt=CURDATE() WHERE idpohon IN ('${P1}','${P2}')`);
rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),${MEMBER_ID},'E2E Tagging','${email}','transfer','IDR',350000,CURDATE(),2,'yes','E2E',NOW(),NOW())`,
);
const CONF_ID = rows(`SELECT id FROM confirmation WHERE invoice='${INVOICE}'`)[0][0];
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${P1}','${DESA1}',${MEMBER_ID},'E2E Tagging',200000,'IDR','transfer',CURDATE(),'',0,2,'${INVOICE}','2029-10-04',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${P2}','${DESA1}',${MEMBER_ID},'E2E Tagging',150000,'IDR','transfer',CURDATE(),'',0,1,'${INVOICE}','2029-10-04',NOW(),NOW())`,
);
const AD1 = rows(`SELECT id FROM data_adopsi WHERE invoice='${INVOICE}' AND idpohon='${P1}'`)[0][0];
const AD2 = rows(`SELECT id FROM data_adopsi WHERE invoice='${INVOICE}' AND idpohon='${P2}'`)[0][0];
assert(!!AD1 && !!AD2, `data_adopsi terpasang (${AD1}, ${AD2})`);

// 3 foto tagging utk P1 (tanggal beda) + 1 foto LEGACY idadopsi=0 (tak boleh tampil)
const D1 = "2026-10-01";
const D2 = "2026-10-02";
rows(`INSERT INTO foto_tagging (idpohon,tanggal,foto,keterangan,idmember,caption,idadopsi,urlGambar) VALUES ('${P1}','${D1}','','',${MEMBER_ID},'',${AD1},'${FOTO_URL}?e2etag=a')`);
rows(`INSERT INTO foto_tagging (idpohon,tanggal,foto,keterangan,idmember,caption,idadopsi,urlGambar) VALUES ('${P1}','${D2}','','',${MEMBER_ID},'',${AD1},'${FOTO_URL}?e2etag=b')`);
rows(`INSERT INTO foto_tagging (idpohon,tanggal,foto,keterangan,idmember,caption,idadopsi,urlGambar) VALUES ('${P1}','${D2}','','',${MEMBER_ID},'',${AD1},'${FOTO_URL}?e2etag=c')`);
rows(`INSERT INTO foto_tagging (idpohon,tanggal,foto,keterangan,idmember,caption,idadopsi,urlGambar) VALUES ('${P1}','2019-07-29','','',1,'',0,'${FOTO_URL}?e2etag=legacy')`);
assert(true, `fixture: P1 proses=2 + 3 foto (+1 legacy), P2 proses=1 tanpa foto`);

// ===== API: scope idadopsi =====
const api = await fetch("http://127.0.0.1:8000/api/fototagingorder", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ invoice: INVOICE }),
}).then((r) => r.json());
assert(api.length === 2, `API balas 2 pohon (${api.map((a) => a.idpohon).join(",")})`);
const apiP1 = api.find((a) => a.idpohon === P1);
const apiP2 = api.find((a) => a.idpohon === P2);
assert(apiP1.foto.length === 3, `API: foto ${P1} = 3 (foto legacy idadopsi=0 TIDAK ikut)`);
assert(apiP2.foto.length === 0, `API: foto ${P2} = 0`);

// ================= UI =================
await page.goto(`${BASE}/dashboard/adopsi/${CONF_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Adopsi Aktif", { timeout: 15000 });
assert(true, `halaman order terbuka (conf ${CONF_ID}) → status Adopsi Aktif`);

// ===== 1. Section Progres Tagging =====
await page.waitForSelector("h2:has-text('Progres Tagging Pohon')", { timeout: 10000 });
assert(true, "section 'Progres Tagging Pohon' tampil");

// ===== 2. Timeline P1 (proses=2 → Sedang Ditandai) =====
const t1 = page.locator(`[data-tagging-tree="${P1}"]`);
assert((await t1.count()) === 1, `kartu tagging ${P1} tampil`);
assert(
  (await t1.locator(`[data-tagging-status="${P1}"]`).textContent()) === "Sedang Ditandai",
  `${P1}: chip status "Sedang Ditandai"`,
);
assert(
  (await t1.locator('[data-step="0"][data-state="done"]').count()) === 1 &&
    (await t1.locator('[data-step="1"][data-state="active"]').count()) === 1 &&
    (await t1.locator('[data-step="2"][data-state="pending"]').count()) === 1,
  `${P1}: langkah 1 selesai, langkah 2 aktif, langkah 3 menunggu`,
);

// ===== 3. Timeline P2 (proses=1 → Menunggu Penandaan) =====
const t2 = page.locator(`[data-tagging-tree="${P2}"]`);
assert(
  (await t2.locator(`[data-tagging-status="${P2}"]`).textContent()) === "Menunggu Penandaan",
  `${P2}: chip status "Menunggu Penandaan"`,
);
assert(
  (await t2.locator('[data-step="1"][data-state="pending"]').count()) === 1,
  `${P2}: langkah penandaan masih menunggu`,
);
assert(
  (await t2.locator("text=Belum ada foto").count()) === 1,
  `${P2}: empty state "Belum ada foto"`,
);

// ===== 4. Galeri foto P1: 3 foto + caption tanggal =====
await page.waitForSelector(`[data-tagging-foto="${P1}"] img`, { timeout: 10000 });
assert(
  (await page.locator(`[data-tagging-foto="${P1}"]`).count()) === 3,
  `galeri ${P1}: tepat 3 foto (legacy tak ikut)`,
);
const cap1 = await page.locator(`[data-tagging-foto="${P1}"]`).first().textContent();
assert(cap1.includes(tglIndo(D1)), `caption foto pertama = "${tglIndo(D1)}"`);

// ===== 5. Lightbox =====
await page.locator(`[data-tagging-foto="${P1}"]`).first().click();
const lb = page.locator('[role="dialog"][aria-label="Foto tagging"]');
await lb.waitFor({ timeout: 5000 });
assert((await lb.textContent()).includes(`foto ke-1 dari 3`), "lightbox: teks 'foto ke-1 dari 3'");
assert(
  (await page.evaluate(() => document.body.style.overflow)) === "hidden",
  "lightbox mengunci scroll body",
);
await page.keyboard.press("Escape");
await lb.waitFor({ state: "hidden", timeout: 5000 });
assert(true, "Escape menutup lightbox");

await page.screenshot({ path: "screenshots/tagging-user.png", fullPage: true });

// ===== 6. Setelah selesai (proses=3): semua langkah done =====
rows(`UPDATE data_adopsi SET proses=3 WHERE id=${AD1}`);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(`[data-tagging-tree="${P1}"]`, { timeout: 10000 });
assert(
  (await t1.locator(`[data-tagging-status="${P1}"]`).textContent()) === "Selesai Ditandai",
  `${P1}: setelah proses=3 → chip "Selesai Ditandai"`,
);
assert(
  (await t1.locator('[data-step="1"][data-state="done"]').count()) === 1 &&
    (await t1.locator('[data-step="2"][data-state="done"]').count()) === 1,
  `${P1}: semua langkah selesai`,
);

// ================= Cleanup =================
rows(`DELETE FROM foto_tagging WHERE idadopsi IN (${AD1},${AD2}) OR urlGambar LIKE '%?e2etag=%'`);
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
rows(`UPDATE data_pohon SET adopted='available', pengasuh=0, invoice='', tgl_adopt=NULL WHERE idpohon IN ('${P1}','${P2}')`);
rows(`DELETE FROM member WHERE id=${MEMBER_ID}`);
console.log("· cleanup: foto, data_adopsi, confirmation, pohon dipulihkan, member dihapus");

await browser.close();
console.log("\n=== SEMUA TAHAP E2E PROGRES TAGGING LULUS ===");
