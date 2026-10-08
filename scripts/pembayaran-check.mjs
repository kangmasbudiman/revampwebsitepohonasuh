// E2E Pencatatan Keuangan (/admin/keuangan/pembayaran): daftar pohon
// "sudah ditagging" sinkron dengan Order Tagging (proses selesai ATAU ada
// foto tagging siklus ini), penerima otomatis petugas desa, CRUD pembayaran
// + filter + KPI + cascade hapus saat order dibatalkan.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/pembayaran-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
const ADMIN = 2682; // admintes2026 (QA)

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

const sql = (s) => s.replace(/'/g, "\\'");

// ================= Fixture awal: bersihkan sisa run lama =================
rows(
  `DELETE pt FROM pembayaran_tagging pt JOIN data_adopsi a ON a.id=pt.idadopsi WHERE a.invoice LIKE 'PEMBY-E2E-%'; DELETE FROM pembayaran_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice LIKE 'PEMBY-E2E-%')`,
);
rows(`DELETE FROM foto_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice LIKE 'PEMBY-E2E-%')`);
rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'PEMBY-E2E-%'`);
rows(`DELETE FROM confirmation WHERE invoice LIKE 'PEMBY-E2E-%'`);
rows(`DELETE FROM cerita WHERE judul LIKE 'PEMBY-E2E-%'`); // no-op safety

const trees = rows(
  `SELECT idpohon FROM data_pohon WHERE adopted='available' AND desa='rantaukermas' AND idpohon IS NOT NULL ORDER BY id LIMIT 3`,
);
assert(trees.length >= 3, `3 pohon available di rantaukermas utk fixture (dapat ${trees.length})`);
const [PA, PB, PC] = trees.map((r) => r[0]);

// Baseline: jumlah pohon tagged belum-dibayar & sudah-dibayar SEBELUM fixture
const [baseBelum, baseSudah] = rows(
  `SELECT SUM(IF(pt.id IS NULL,1,0)), SUM(IF(pt.id IS NOT NULL,1,0)) FROM data_adopsi a JOIN confirmation c ON c.invoice=a.invoice LEFT JOIN pembayaran_tagging pt ON pt.idadopsi=a.id WHERE c.confirmation='yes' AND (a.proses=3 OR EXISTS(SELECT 1 FROM foto_tagging f WHERE f.idadopsi=a.id))`,
)[0].map((v) => Number(v ?? 0));
console.log(`   baseline: belum=${baseBelum} sudah=${baseSudah}`);

// Petugas rantaukermas (penerima default)
const petugasDesa = rows(
  `SELECT GROUP_CONCAT(m.name SEPARATOR ', ') FROM desa_petugas dp JOIN desa d ON d.id=dp.iddesa JOIN member m ON m.id=dp.idpetugas WHERE d.nama='rantaukermas'`,
)[0][0];

function insertFixture(inv, idpohon, proses) {
  rows(
    `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,created_at,updated_at) VALUES ('${inv}',CURDATE(),2681,'E2E Pembayaran','e2e@pohon.asuh','Transfer','IDR',200000,CURDATE(),1,'yes',NOW(),NOW())`,
  );
  const idc = one(`SELECT id FROM confirmation WHERE invoice='${inv}'`);
  const ida = one(
    `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,gfrom,certnum,dur,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${idpohon}','rantaukermas',2681,'E2E Pembayaran',200000,'IDR','Transfer',CURDATE(),0,NULL,1,'',0,${proses},'${inv}',DATE_ADD(CURDATE(), INTERVAL 1 YEAR),NOW(),NOW()); SELECT LAST_INSERT_ID();`,
  );
  return { idc: Number(idc), ida: Number(ida) };
}

const FA = insertFixture("PEMBY-E2E-A", PA, 3); // tagged via proses selesai
const FB = insertFixture("PEMBY-E2E-B", PB, 2); // tagged via foto (diisi bawah)
const FC = insertFixture("PEMBY-E2E-C", PC, 1); // BELUM tagged — tidak boleh muncul
rows(
  `INSERT INTO foto_tagging (idpohon,tanggal,idmember,idadopsi,urlGambar) VALUES ('${PB}',CURDATE(),2683,${FB.ida},'pembayaran-e2e.png')`,
);
assert(FA.ida > 0 && FB.ida > 0 && FC.ida > 0 && FA.idc > 0 && FB.idc > 0, `fixture terpasang (A=${FA.ida} B=${FB.ida} C=${FC.ida})`);

const maxPesan = Number(one(`SELECT IFNULL(MAX(id),0) FROM pesan_notif`) || 0);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const token = await new SignJWT({ userId: ADMIN, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
// ConfirmSubmit (hapus) = modal — auto-klik tombol konfirmasinya
await page.addInitScript(() => {
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

// ================= 1. Halaman + KPI =================
await page.goto(`${BASE}/admin/keuangan/pembayaran`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Pencatatan Keuangan", exact: true }).waitFor({ timeout: 30000 });
assert(true, "halaman /admin/keuangan/pembayaran termuat (admin level 1)");

const kpiBelum = Number(one(
  `SELECT COUNT(*) FROM data_adopsi a JOIN confirmation c ON c.invoice=a.invoice LEFT JOIN pembayaran_tagging pt ON pt.idadopsi=a.id WHERE c.confirmation='yes' AND (a.proses=3 OR EXISTS(SELECT 1 FROM foto_tagging f WHERE f.idadopsi=a.id)) AND pt.id IS NULL`,
));
const kpiText = await page.locator("main").innerText();
assert(
  new RegExp(`${kpiBelum.toLocaleString("id-ID")} pohon`).test(kpiText),
  `KPI "Belum dibayar" = ${kpiBelum} pohon (baseline ${baseBelum} + 2 fixture)`,
);
assert(/Rp[\s  ]?0(,00)?/.test(kpiText) || baseSudah > 0, "KPI total dibayarkan tampil");

// ================= 2. Baris fixture: sinkron tagging =================
const rowA = page.locator(`tr[data-idadopsi="${FA.ida}"]`);
const rowB = page.locator(`tr[data-idadopsi="${FB.ida}"]`);
await rowA.waitFor({ timeout: 15000 });
assert((await rowA.getByTestId("chip-belum-bayar").count()) === 1, `pohon ${PA} (proses selesai) muncul "Belum dibayar"`);
assert((await rowB.getByTestId("chip-belum-bayar").count()) === 1, `pohon ${PB} (1 foto tagging) muncul via kriteria foto`);
assert((await rowB.innerText()).includes("1 foto"), "baris B menampilkan jumlah foto tagging");
assert((await page.locator(`tr[data-idadopsi="${FC.ida}"]`).count()) === 0, `pohon ${PC} (belum ditagging) TIDAK muncul`);
assert((await rowA.innerText()).includes(petugasDesa), `kolom petugas desa terisi otomatis (${petugasDesa})`);

// ================= 3. Catat pembayaran via modal =================
await page.locator(`button[aria-label="Catat pembayaran ${PA}"]`).click();
const dlg = page.locator('[role="dialog"][aria-label="Catat pembayaran"]');
await dlg.waitFor({ timeout: 10000 });
assert((await dlg.locator('input[name="penerima"]').inputValue()) === petugasDesa, "penerima ter-prefill petugas desa");
assert((await dlg.locator('input[name="jumlah"]').inputValue()) === "200000", "jumlah ter-prefill nilai adopsi (200000)");
await dlg.getByRole("button", { name: "Simpan Pembayaran" }).click();
await dlg.getByText("Pembayaran tersimpan.").waitFor({ timeout: 30000 });
await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 15000 });
assert(true, "modal catat pembayaran sukses & tertutup");

const dbBayar = rows(`SELECT penerima,jumlah,tanggal,metode FROM pembayaran_tagging WHERE idadopsi=${FA.ida}`)[0];
assert(dbBayar && dbBayar[0] === petugasDesa && dbBayar[1] === "200000" && dbBayar[3] === "Tunai",
  `DB: pembayaran A tersimpan (penerima petugas desa, ${dbBayar?.[1]}, ${dbBayar?.[3]})`);
assert((await rowA.getByTestId("chip-dibayar").count()) === 1, "baris A kini ber-chip Dibayar");

// ================= 4. KPI ikut ter-update setelah bayar =================
await page.waitForTimeout(1200); // router.refresh selesai
const kpiSudah = Number(one(`SELECT COUNT(*) FROM pembayaran_tagging pt JOIN data_adopsi a ON a.id=pt.idadopsi WHERE a.invoice LIKE 'PEMBY-E2E-%' OR a.invoice NOT LIKE 'PEMBY-E2E-%'`) || 0);
const kpiText2 = await page.locator("main").innerText();
assert(/1 pohon sudah dibayar/.test(kpiText2), "KPI: 1 pohon sudah dibayar");
assert(/Rp[\s  ]?200\.000/.test(kpiText2), "KPI: total dibayarkan Rp200.000");

// ================= 5. Filter =================
await page.locator('select[aria-label="Filter status pembayaran"]').selectOption("belum");
await page.locator('input[aria-label="Cari pohon"]').fill("PEMBY-E2E");
await page.waitForTimeout(400);
assert((await page.locator("tbody tr[data-idadopsi]").count()) === 1, "filter belum+cari → hanya B");
await page.locator('select[aria-label="Filter status pembayaran"]').selectOption("sudah");
await page.waitForTimeout(400);
assert((await page.locator("tbody tr[data-idadopsi]").count()) === 1, "filter sudah+cari → hanya A");
await page.locator('button[aria-label="Reset filter"]').click();
await page.waitForTimeout(400);

// ================= 6. Edit pembayaran =================
await page.locator(`button[aria-label="Edit pembayaran ${PA}"]`).click();
const dlgEdit = page.locator('[role="dialog"][aria-label="Edit pembayaran"]');
await dlgEdit.waitFor({ timeout: 10000 });
await dlgEdit.locator('input[name="jumlah"]').fill("150000");
await dlgEdit.locator('select[name="metode"]').selectOption("QRIS");
await dlgEdit.getByRole("button", { name: "Simpan Pembayaran" }).click();
await dlgEdit.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
const chipA = await rowA.getByTestId("chip-dibayar").innerText();
assert(/150\.000/.test(chipA) && /QRIS/.test(chipA), `chip A ter-update (Rp150.000 · QRIS): "${chipA.trim()}"`);
assert(one(`SELECT jumlah FROM pembayaran_tagging WHERE idadopsi=${FA.ida}`) === "150000", "DB: jumlah ter-edit 150000");

// ================= 7. Hapus pembayaran (modal konfirmasi) =================
await page.locator(`tr[data-idadopsi="${FA.ida}"] button:has-text("Hapus")`).click();
await page.waitForURL("**/admin/keuangan/pembayaran?deleted=1", { timeout: 30000 });
assert(one(`SELECT COUNT(*) FROM pembayaran_tagging WHERE idadopsi=${FA.ida}`) === "0", "DB: pembayaran A terhapus");
await page.locator(`tr[data-idadopsi="${FA.ida}"]`).getByTestId("chip-belum-bayar").waitFor({ timeout: 15000 });
assert(true, "baris A kembali 'Belum dibayar' + banner ?deleted=1");

// ================= 8. Cascade: bayar B lalu order dibatalkan =================
const resBayar = await (await fetch(`${API}/tambahpembayaran`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `idadopsi=${FB.ida}&jumlah=200000&tanggal=${new Date().toISOString().slice(0, 10)}&metode=Transfer&penerima=&iduser=${ADMIN}`,
})).json();
assert(Number(resBayar.value) === 200, `pembayaran B via API (${resBayar.pesan})`);

const resBatal = await (await fetch(`${API}/batalverivication`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `id=${FB.idc}&iduser=${ADMIN}`,
})).json();
assert(Number(resBatal.code) === 200, "order B dibatalkan via API (batalverivication)");
assert(one(`SELECT COUNT(*) FROM pembayaran_tagging WHERE idadopsi=${FB.ida}`) === "0", "CASCADE: pembayaran B ikut terhapus saat order batal");
assert(one(`SELECT COUNT(*) FROM data_adopsi WHERE id=${FB.ida}`) === "0", "data_adopsi B terhapus (pola batal)");
assert(one(`SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=${FB.ida}`) === "0", "foto tagging B terhapus");

// ================= Cleanup =================
rows(`DELETE FROM pembayaran_tagging WHERE idadopsi IN (${FA.ida},${FB.ida},${FC.ida})`);
rows(`DELETE FROM foto_tagging WHERE idadopsi IN (${FA.ida},${FB.ida},${FC.ida})`);
rows(`DELETE FROM data_adopsi WHERE invoice LIKE 'PEMBY-E2E-%'`);
rows(`DELETE FROM confirmation WHERE invoice LIKE 'PEMBY-E2E-%'`);
rows(`DELETE FROM pesan_notif WHERE idmember=2681 AND id>${maxPesan}`);
await browser.close();
console.log("\n=== SEMUA TES PENCATATAN KEUANGAN LULUS ===");
