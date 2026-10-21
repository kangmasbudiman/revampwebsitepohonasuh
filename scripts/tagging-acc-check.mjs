// E2E alur acc Order Tagging: hanya tab Baru/Diproses/Selesai (tanpa "Semua");
// tab Baru tanpa form catatan/foto → petugas klik Mulai Proses → notifikasi
// admin + badge menu → negatif pra-acc (upload/catatan/selesai/mulai ulang
// ditolak 409) → Tolak → order kembali ke Baru → ajukan ulang → Acc → form
// foto & catatan terbuka → unggah foto + catatan → Tandai Selesai (proses=3).
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/tagging-acc-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
const INV = `E2E-ACC-${Date.now() % 100000}`;
const ADMIN_ID = 2682;
const PETUGAS_ID = 2683; // Petugas Taging (level 2, rantaukermas)

const rows = (sql) =>
  execSync(
    `mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`,
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

const one = (sql) => rows(sql)[0]?.[0] ?? "";
const val = (sql) => Number(one(sql));

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};

// ---- cleanup sisa run gagal ----
const bersihkan = () =>
  rows(
    `DELETE FROM pembayaran_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice LIKE 'E2E-ACC-%')` +
      `; DELETE FROM foto_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice LIKE 'E2E-ACC-%')` +
      `; DELETE FROM image WHERE idorder IN (SELECT id FROM data_adopsi WHERE invoice LIKE 'E2E-ACC-%')` +
      `; DELETE FROM data_adopsi WHERE invoice LIKE 'E2E-ACC-%'` +
      `; DELETE FROM confirmation WHERE invoice LIKE 'E2E-ACC-%'`,
  );
bersihkan();

// ---- fixture: order Baru (proses=1) desa rantaukermas + confirmation yes ----
const [pohonKode, adoptedAwal] =
  rows(
    `SELECT p.idpohon, p.adopted FROM data_pohon p WHERE p.desa='rantaukermas' ` +
      `AND NOT EXISTS (SELECT 1 FROM data_adopsi d WHERE d.idpohon=p.idpohon AND d.proses<3) ` +
      `ORDER BY (p.adopted='available') DESC, p.id LIMIT 1`,
  )[0] ?? [];
assert(!!pohonKode, `pohon bebas rantaukermas ditemukan (${pohonKode}, ${adoptedAwal})`);

rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,created_at,updated_at) ` +
    `VALUES ('${INV}',CURDATE(),2681,'E2E Acc','e2e-acc@pohon.asuh','Transfer','IDR',200000,CURDATE(),1,'yes',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,gfrom,certnum,dur,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) ` +
    `VALUES ('${pohonKode}','rantaukermas',2681,'E2E Acc',200000,'IDR','Transfer',CURDATE(),0,NULL,1,'',1,1,'${INV}',DATE_ADD(CURDATE(), INTERVAL 1 YEAR),NOW(),NOW())`,
);
const ida = Number(one(`SELECT id FROM data_adopsi WHERE invoice='${INV}'`));
assert(ida > 0, `fixture ${INV} terpasang (data_adopsi ${ida}, pohon ${pohonKode})`);

const pesanMax = val("SELECT COALESCE(MAX(id),0) FROM pesan_notif");
const fotoMax = val("SELECT COALESCE(MAX(id),0) FROM foto_tagging");
const imageMax = val("SELECT COALESCE(MAX(id),0) FROM image");

const api = async (path, form) => {
  const res = await fetch(`${API}/${path}`, {
    method: form ? "POST" : "GET",
    body: form ? new URLSearchParams(form) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const sign = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("2h").sign(secret);

// auto-klik tombol konfirmasi modal ConfirmSubmit (pola btor-check)
const pasangAutoConfirm = (ctx) =>
  ctx.addInitScript(() => {
    const pasang = () => {
      new MutationObserver(() => {
        document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
          if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    };
    document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
  });

const browser = await chromium.launch();

const petugasCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(petugasCtx);
petugasCtx.addCookies([{ name: "pa_session", value: await sign({ userId: PETUGAS_ID, name: "Petugas Taging", role: "ADMIN", level: 2 }), url: BASE }]);
const p = await petugasCtx.newPage();
p.on("dialog", (d) => d.accept()); // confirm() native tombol Tandai Selesai

const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(adminCtx);
adminCtx.addCookies([{ name: "pa_session", value: await sign({ userId: ADMIN_ID, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE }]);
const a = await adminCtx.newPage();
a.on("dialog", (d) => d.accept());

const kartuDi = (pg) => pg.locator("div.rounded-2xl.border", { hasText: INV }).first();

// ================= 1. Tab: hanya Baru/Diproses/Selesai =================
await p.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
await p.getByRole("heading", { name: "Order Tagging", exact: true }).waitFor({ timeout: 30000 });
assert((await p.getByRole("link", { name: /^Baru \(\d+\)$/ }).count()) === 1, "tab Baru tampil");
assert((await p.getByRole("link", { name: /^Diproses \(\d+\)$/ }).count()) === 1, "tab Diproses tampil");
assert((await p.getByRole("link", { name: /^Selesai \(\d+\)$/ }).count()) === 1, "tab Selesai tampil");
assert((await p.getByRole("link", { name: /^Semua/ }).count()) === 0, 'tab "Semua" dihapus');
assert(p.url().includes("proses=1") || p.url().endsWith("/admin/tagging"), "default halaman = tab Baru");

// ================= 2. Tab Baru: tanpa form, hanya Mulai Proses =================
await kartuDi(p).waitFor({ timeout: 15000 });
assert((await kartuDi(p).locator('[data-testid="btn-mulai-proses"]').count()) === 1, "tab Baru: tombol Mulai Proses tampil (petugas)");
assert((await kartuDi(p).locator('[data-testid="form-upload-tagging"]').count()) === 0, "tab Baru: form upload TIDAK tampil");
assert((await kartuDi(p).locator('input[name="note"]').count()) === 0, "tab Baru: form catatan TIDAK tampil");

await a.goto(`${BASE}/admin/tagging?proses=1`, { waitUntil: "networkidle" });
await kartuDi(a).waitFor({ timeout: 15000 });
assert((await kartuDi(a).getByText("Menunggu petugas memulai proses.").count()) === 1, "admin tab Baru: teks menunggu petugas");
assert((await kartuDi(a).locator('[data-testid="btn-acc-tagging"]').count()) === 0, "admin tab Baru: belum ada tombol Acc");

// ================= 3. Mulai Proses → menunggu acc =================
await kartuDi(p).locator('[data-testid="btn-mulai-proses"]').click();
await p.waitForURL("**proses=2&mulai=1", { timeout: 30000 });
assert((await p.getByText("Permintaan proses dikirim — menunggu persetujuan admin.").count()) >= 1, "banner permintaan terkirim");
assert((await kartuDi(p).locator('[data-testid="chip-menunggu-acc"]').count()) === 1, "kartu Di Proses: chip Menunggu Acc Admin");
assert((await kartuDi(p).locator('[data-testid="form-upload-tagging"]').count()) === 0, "pra-acc: form upload belum tampil bagi petugas");
assert(one(`SELECT CONCAT(proses,'/',acc_tagging) FROM data_adopsi WHERE id=${ida}`) === "2/0", "DB: proses=2, acc_tagging=0");
assert(
  val(`SELECT COUNT(*) FROM pesan_notif WHERE id>${pesanMax} AND idmember IN (SELECT id FROM member WHERE admin=1) AND pesan LIKE '%menunggu persetujuan'`) >= 1,
  "notifikasi pesan_notif ke semua admin",
);

// Badge menu admin bertambah saat ada permintaan menunggu
await a.goto(`${BASE}/admin/tagging?proses=2`, { waitUntil: "networkidle" });
await kartuDi(a).waitFor({ timeout: 15000 });
const badge = a.locator('[data-testid="nav-badge-tagging"]');
assert((await badge.count()) >= 1, "badge menu Order Tagging muncul (admin)");
const angkaBadge = Number(await badge.first().textContent());

// ================= 4. Negatif pra-acc: API ditolak 409 =================
const fd = new FormData();
fd.append("image", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }), "k.jpg");
fd.append("idpohon", pohonKode);
fd.append("idadopsi", String(ida));
fd.append("idmember", String(PETUGAS_ID));
fd.append("tanggal", new Date().toISOString().slice(0, 10));
const rUpload = await (await fetch(`${API}/uploadfototaging`, { method: "POST", body: fd })).json();
assert(String(rUpload?.value) === "409", `pra-acc uploadfototaging → 409 (${rUpload?.pesan})`);

const rNote = await api("updatenoted", { idorder: ida, note: "jangan tersimpan" });
assert(String(rNote.json?.value) === "409", `pra-acc updatenoted → 409 (${rNote.json?.pesan})`);
const rDone = await api("updatestatuscomplate", { id: ida, idpohon: pohonKode });
assert(String(rDone.json?.value) === "409", `pra-acc updatestatuscomplate → 409 (${rDone.json?.pesan})`);
const rMulai = await api("updatestatusproses", { id: ida });
assert(String(rMulai.json?.value) === "409" && /Baru/.test(rMulai.json?.pesan ?? ""), `updatestatusproses ulang → 409 (${rMulai.json?.pesan})`);
assert(val(`SELECT COUNT(*) FROM image WHERE idorder=${ida} AND id>${imageMax}`) === 0, "pra-acc: catatan tidak tersimpan");
assert(val(`SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=${ida} AND id>${fotoMax}`) === 0, "pra-acc: foto tidak tersimpan");

// ================= 5. Admin Tolak → kembali ke tab Baru =================
assert((await kartuDi(a).locator('[data-testid="btn-acc-tagging"]').count()) === 1, "admin: tombol Acc tampil di kartu");
await kartuDi(a).locator('[data-testid="btn-tolak-tagging"]').click();
await a.waitForURL("**proses=2&tolak=1", { timeout: 30000 });
assert((await a.getByText("Permintaan ditolak — order kembali ke daftar Baru.").count()) >= 1, "banner permintaan ditolak");
assert(one(`SELECT CONCAT(proses,'/',acc_tagging,'/',IFNULL(acc_by,'-')) FROM data_adopsi WHERE id=${ida}`) === "1/0/-", "tolak: DB proses=1, acc reset");
assert((await kartuDi(a).count()) === 0, "tolak: kartu hilang dari tab Diproses");
assert(
  val(`SELECT COUNT(*) FROM pesan_notif WHERE id>${pesanMax} AND idmember=${PETUGAS_ID} AND pesan LIKE '%DITOLAK admin%'`) >= 1,
  "notifikasi DITOLAK ke petugas",
);

await p.goto(`${BASE}/admin/tagging?proses=1`, { waitUntil: "networkidle" });
await kartuDi(p).waitFor({ timeout: 15000 });
assert((await kartuDi(p).locator('[data-testid="btn-mulai-proses"]').count()) === 1, "setelah tolak: order kembali di tab Baru (bisa ajukan ulang)");

// ================= 6. Ajukan ulang → admin Acc =================
await kartuDi(p).locator('[data-testid="btn-mulai-proses"]').click();
await p.waitForURL("**proses=2&mulai=1", { timeout: 30000 });
assert(one(`SELECT proses FROM data_adopsi WHERE id=${ida}`) === "2", "ajukan ulang: proses=2 lagi");

await a.goto(`${BASE}/admin/tagging?proses=2`, { waitUntil: "networkidle" });
await kartuDi(a).waitFor({ timeout: 15000 });
await kartuDi(a).locator('[data-testid="btn-acc-tagging"]').click();
await a.waitForURL("**proses=2&acc=1", { timeout: 30000 });
assert((await a.getByText("Permintaan disetujui — petugas dapat mengunggah foto dan catatan.").count()) >= 1, "banner permintaan disetujui");
assert(
  one(`SELECT CONCAT(acc_tagging,'/',acc_by) FROM data_adopsi WHERE id=${ida}`) === `1/${ADMIN_ID}`,
  "acc: DB acc_tagging=1 + acc_by admin",
);
assert(
  val(`SELECT COUNT(*) FROM pesan_notif WHERE id>${pesanMax} AND idmember=${PETUGAS_ID} AND pesan LIKE '%DISETUJUI admin%'`) >= 1,
  "notifikasi DISETUJUI ke petugas desa",
);
if (angkaBadge - 1 <= 0) {
  assert((await a.locator('[data-testid="nav-badge-tagging"]').count()) === 0, "badge menu kembali kosong setelah acc");
}

// ================= 7. Petugas: form terbuka → upload + catatan =================
await p.goto(`${BASE}/admin/tagging?proses=2`, { waitUntil: "networkidle" });
await kartuDi(p).waitFor({ timeout: 15000 });
assert((await kartuDi(p).locator('[data-testid="chip-menunggu-acc"]').count()) === 0, "setelah acc: chip menunggu hilang");
assert((await kartuDi(p).locator('[data-testid="form-upload-tagging"]').count()) === 1, "setelah acc: form upload tampil");
assert((await kartuDi(p).locator('input[name="note"]').count()) === 1, "setelah acc: form catatan tampil");

await kartuDi(p).locator('[data-testid="form-upload-tagging"] input[type="file"]').setInputFiles("/tmp/test-cover.jpg");
await kartuDi(p).locator('button:has-text("Unggah")').click();
await p.waitForSelector("text=Foto tagging terunggah", { timeout: 30000 });
assert(val(`SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=${ida} AND id>${fotoMax}`) >= 1, "upload via UI → row foto_tagging");

await kartuDi(p).locator('input[name="note"]').fill("Catatan E2E acc");
await kartuDi(p).locator('button:has-text("Simpan Catatan")').click();
await p.waitForURL("**catatan=1", { timeout: 30000 });
assert(one(`SELECT note FROM image WHERE idorder=${ida} ORDER BY id DESC LIMIT 1`) === "Catatan E2E acc", "catatan order tersimpan");

// ================= 8. Tandai Selesai =================
await p.goto(`${BASE}/admin/tagging?proses=2`, { waitUntil: "networkidle" });
await kartuDi(p).waitFor({ timeout: 15000 });
await kartuDi(p).locator('[data-testid="btn-tandai-selesai"]').click();
await p.waitForURL("**selesai=1", { timeout: 30000 });
assert(one(`SELECT proses FROM data_adopsi WHERE id=${ida}`) === "3", "selesai: DB proses=3");
assert(one(`SELECT adopted FROM data_pohon WHERE idpohon='${pohonKode}'`) === "adopted", "selesai: pohon jadi adopted");

await p.goto(`${BASE}/admin/tagging?proses=3`, { waitUntil: "networkidle" });
assert((await kartuDi(p).count()) === 1, "kartu tampil di tab Selesai");

// ================= Cleanup =================
rows(
  `UPDATE data_pohon SET adopted='${adoptedAwal}' WHERE idpohon='${pohonKode}'` +
    `; DELETE FROM pembayaran_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice='${INV}')` +
    `; DELETE FROM foto_tagging WHERE idadopsi IN (SELECT id FROM data_adopsi WHERE invoice='${INV}')` +
    `; DELETE FROM image WHERE idorder IN (SELECT id FROM data_adopsi WHERE invoice='${INV}')` +
    `; DELETE FROM data_adopsi WHERE invoice='${INV}'` +
    `; DELETE FROM confirmation WHERE invoice='${INV}'` +
    `; DELETE FROM pesan_notif WHERE id>${pesanMax}`,
);
await browser.close();
console.log("\n=== SEMUA TES ALUR ACC ORDER TAGGING LULUS ===");
