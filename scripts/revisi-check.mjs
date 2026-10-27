// E2E 5 revisi: (1) filter provinsi /admin/adopsi, (2) notifikasi klik →
// halaman tujuan (pesan_notif.link), (4) multi-upload foto tagging,
// (5) BTOR revisi dikirim ulang dari form edit (hidden id → editbtor).
// Poin 3 (hadiah adopsi mandiri) diverifikasi lewat curl riwayatpohon.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";

const rows = (sql) =>
  execSync(
    `mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`,
  )
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForDb(fn, timeout = 20000, label = "DB") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const v = fn();
      if (v) return v;
    } catch {}
    await sleep(400);
  }
  throw new Error(`waitForDb timeout: ${label}`);
}

const PETUGAS_ID = 2683; // Petugas Taging — ditugaskan desa 1 (rantaukermas)
const ADMIN_ID = 2682;
const JUDUL = `E2E Revisi BTOR Rantau Kermas`;

// ---- cleanup sisa run gagal ----
const bersihkan = () => {
  const ids = rows(`SELECT id FROM btor WHERE judul='${JUDUL}'`).map((r) => r[0]);
  if (ids.length) {
    rows(
      `DELETE FROM btor_riwayat WHERE idbtor IN (${ids.join(",")});` +
        ` DELETE FROM btor_memo WHERE idbtor IN (${ids.join(",")});` +
        ` DELETE FROM btor_order WHERE idbtor IN (${ids.join(",")});` +
        ` DELETE FROM btor WHERE id IN (${ids.join(",")});`,
    );
  }
  rows(`DELETE FROM pesan_notif WHERE pesan='E2E Uji link notifikasi'`);
  rows(`DELETE FROM foto_tagging WHERE idadopsi=3617 AND idmember=${ADMIN_ID}`);
};
bersihkan();

// fixture: 1 order kandidat rantaukermas utk BTOR
const kand = rows(
  `SELECT id, price FROM data_adopsi WHERE desa='rantaukermas' AND proses=3 ` +
    `AND id NOT IN (SELECT idadopsi FROM btor_order) ORDER BY id DESC LIMIT 1`,
).map((r) => ({ id: Number(r[0]), price: Number(r[1]) }));
assert(kand.length === 1, `kandidat BTOR siap (id ${kand[0]?.id})`);
const ORD = kand[0];

// order multi-upload: A147 proses=2 acc=1
const up = rows(`SELECT id FROM data_adopsi WHERE idpohon='A147' AND proses=2 AND acc_tagging=1`);
assert(up.length === 1, "order A147 proses=2 acc=1 tersedia utk multi-upload");

const jmlRantau = Number(rows(`SELECT COUNT(*) FROM data_adopsi WHERE desa='rantaukermas'`)[0][0]);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const sign = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("2h").sign(secret);
const tokAdmin = await sign({ userId: ADMIN_ID, name: "Admin Pohon Asuh", role: "ADMIN", hak: ["memo"] });
const tokPetugas = await sign({ userId: PETUGAS_ID, name: "Petugas Taging", role: "ADMIN", level: 2 });

const browser = await chromium.launch();

// ============ 1. FILTER PROVINSI ============
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/adopsi`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector('select[aria-label="Filter provinsi"]', { timeout: 20000 });

  const ambilJumlah = async () => {
    const t = await p.locator("span.text-xs", { hasText: "data" }).first().innerText();
    return Number(t.replace(/\./g, "").match(/(\d+)\s*data/)?.[1] ?? 0);
  };
  const semuanya = await ambilJumlah();
  const opsiAwal = await p.locator('select[aria-label="Filter lokasi"] option').allInnerTexts();
  assert(semuanya > jmlRantau, `tanpa filter: ${semuanya} data (rantaukermas ${jmlRantau})`);
  assert(opsiAwal.length > 2, `opsi lokasi awal ${opsiAwal.length - 1} desa (belum ter-scope)`);

  await p.selectOption('select[aria-label="Filter provinsi"]', "Jambi");
  await p.waitForTimeout(300);
  const jmlJambi = await ambilJumlah();
  const opsiDesa = await p.locator('select[aria-label="Filter lokasi"] option').allInnerTexts();
  assert(jmlJambi === jmlRantau, `filter Jambi → ${jmlJambi} data (=${jmlRantau} rantaukermas)`);
  assert(
    opsiDesa.length === 2 && opsiDesa.includes("Semua lokasi"),
    `opsi lokasi ter-scope provinsi: ${opsiDesa.join(", ")}`,
  );
  await ctx.close();
  console.log("— filter provinsi OK");
}

// ============ 2. NOTIFIKASI → LINK ============
{
  rows(
    `INSERT INTO pesan_notif (idmember,pesan,pesan_en,link,status,created_at,updated_at) ` +
      `VALUES (${ADMIN_ID},'E2E Uji link notifikasi','E2E notif link test','/admin/tagging?proses=2','noread',NOW(),NOW())`,
  );
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await p.click('button[aria-label="Notifikasi"]', { timeout: 20000 });
  await p.waitForSelector("[data-notif-popup]", { timeout: 10000 });
  await p.locator("[data-notif-popup] a, [data-notif-popup] button")
    .filter({ hasText: "E2E Uji link notifikasi" })
    .first()
    .click();
  await p.waitForURL("**/admin/tagging?proses=2", { timeout: 15000 });
  assert(p.url().includes("/admin/tagging?proses=2"), `klik notifikasi → ${p.url()}`);
  await ctx.close();
  rows(`DELETE FROM pesan_notif WHERE pesan='E2E Uji link notifikasi'`);
  console.log("— notifikasi link OK");
}

// ============ 5. BTOR REVISI → KIRIM ULANG ============
let idBtor = 0;
{
  // petugas buat + kirim
  const ctxP = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctxP.addCookies([{ name: "pa_session", value: tokPetugas, url: BASE }]);
  const p = await ctxP.newPage();
  await p.goto(`${BASE}/admin/btor/baru`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector(`[data-testid="kandidat-${ORD.id}"]`, { timeout: 20000 });
  await p.locator(`[data-testid="kandidat-${ORD.id}"] input[type="checkbox"]`).check();
  await p.click('[data-testid="tambah-hari"]');
  await p.fill('[data-testid="entri-teks-0"]', "E2E: pemasangan banner tagging dan dokumentasi.");
  await p.fill('input[name="judul"]', JUDUL);
  await p.click('[data-testid="kirim-btor"]');
  await p.waitForURL(/\/admin\/btor\/\d+\?created/, { timeout: 20000 });
  idBtor = Number(p.url().match(/\/admin\/btor\/(\d+)/)?.[1] ?? 0);
  assert(idBtor > 0, `BTOR #${idBtor} terkirim oleh petugas`);
  await ctxP.close();

  // admin minta revisi
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctxA.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
  const a = await ctxA.newPage();
  await a.goto(`${BASE}/admin/btor/${idBtor}`, { waitUntil: "domcontentloaded" });
  await a.click("summary", { hasText: "Minta Revisi" });
  await a.fill('input[name="catatan"]', "E2E: lengkapi foto dokumentasi.");
  await a.click('button:has-text("Kirim Permintaan Revisi")');
  await waitForDb(() => rows(`SELECT id FROM btor WHERE id=${idBtor} AND status='revisi'`).length === 1);
  assert(true, `status BTOR #${idBtor} = revisi`);
  await ctxA.close();

  // petugas edit → Kirim Ulang (inti bug: hidden id → editbtor)
  const ctxP2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctxP2.addCookies([{ name: "pa_session", value: tokPetugas, url: BASE }]);
  const p2 = await ctxP2.newPage();
  await p2.goto(`${BASE}/admin/btor/${idBtor}/edit`, { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(`[data-testid="kandidat-${ORD.id}"]`, { timeout: 20000 });
  const hiddenId = await p2
    .locator('form:has([data-testid="kirim-btor"]) input[name="id"]')
    .inputValue();
  assert(Number(hiddenId) === idBtor, `form edit membawa hidden id=${hiddenId}`);
  await p2.locator(`[data-testid="kandidat-${ORD.id}"] input[type="checkbox"]`).check();
  await p2.click('[data-testid="kirim-btor"]');
  await p2.waitForURL(/\/admin\/btor\/\d+\?dikirim/, { timeout: 20000 });
  const st = rows(`SELECT status FROM btor WHERE id=${idBtor}`)[0][0];
  assert(st === "terkirim", `Kirim Ulang sukses — status kembali "${st}"`);
  await ctxP2.close();
  console.log("— BTOR kirim ulang OK");
}

// ============ 4. MULTI-UPLOAD FOTO TAGGING ============
{
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  ctx.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/tagging?proses=2`, { waitUntil: "domcontentloaded" });
  const kartu = p
    .locator("div.pa-card", { hasText: "A147" })
    .filter({ has: p.locator('[data-testid="form-upload-tagging"]') })
    .first();
  await kartu.waitFor({ timeout: 20000 });
  const sebelum = Number(rows(`SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=3617`)[0][0]);
  await kartu.locator('input[type="file"]').setInputFiles([
    { name: "e2e-a.png", mimeType: "image/png", buffer: png },
    { name: "e2e-b.png", mimeType: "image/png", buffer: png },
  ]);
  await kartu.locator('button:has-text("Unggah")').click();
  await kartu.locator("text=2 foto tagging terunggah.").waitFor({ timeout: 30000 });
  const sesudah = Number(rows(`SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=3617`)[0][0]);
  assert(sesudah - sebelum === 2, `2 foto baru tersimpan (${sebelum} → ${sesudah})`);
  await ctx.close();
  console.log("— multi-upload OK");
}

bersihkan();
await browser.close();
console.log("\nSEMUA CEK 5 REVISI LULUS (poin 3 via curl riwayatpohon).");
