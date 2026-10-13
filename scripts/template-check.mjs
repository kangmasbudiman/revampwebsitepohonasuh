// E2E template sertifikat: admin unggah template latar, donatur memilih
// saat share via ?tpl=<id> (tidak persist). Cakupan: API templatelist array
// polos; resolusi ?tpl → template utama → bg.png; guest tanpa picker;
// pemilik: picker + ganti latar + tombol share; admin UI: tambah/edit/
// utama/nonaktif/hapus; cleanup file upload DB-driven (nama spesifik,
// TANPA glob — aturan insiden produksi 2026-10-11).
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/template-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

// Fixture gambar untuk upload admin (pola admin-check)
if (!fs.existsSync("/tmp/test-cover.jpg")) {
  execSync(`sips -s format jpeg --resampleWidth 800 public/images/papan-taging.png --out /tmp/test-cover.jpg`);
}

// ===== Fixture DB =====
const STAMP = Date.now();
const NAMA_A = `E2E Template A ${STAMP}`;
const NAMA_B = `E2E Template B ${STAMP}`;
const NAMA_C = `E2E Template C ${STAMP}`;
const ASSET = "1676383071330.jpg"; // file yang pasti ada di public/assets lokal
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "INSERT INTO template_sertifikat (nama,file,aktif,utama,created_at,updated_at) VALUES ('${NAMA_A}','${ASSET}',1,1,NOW(),NOW()),('${NAMA_B}','1676465306902.jpg',1,0,NOW(),NOW())" 2>/dev/null`,
);
const [ID_A, FILE_A] = rows(`SELECT id,file FROM template_sertifikat WHERE nama='${NAMA_A}'`)[0];
const [ID_B, FILE_B] = rows(`SELECT id,file FROM template_sertifikat WHERE nama='${NAMA_B}'`)[0];
ok("fixture 2 template ter-insert", !!ID_A && !!ID_B, `A=${ID_A} B=${ID_B}`);

// Sertifikat fixture: certnum pengasuh tunggal terbaru (pola memo-check)
const [CERT, PEMILIK] = rows(
  `SELECT certnum, MIN(pengasuh) FROM data_adopsi WHERE certnum<>'' AND certnum IS NOT NULL
   GROUP BY certnum HAVING COUNT(DISTINCT pengasuh)=1 ORDER BY MAX(id) DESC LIMIT 1`,
)[0];
if (!CERT) throw new Error("butuh certnum fixture");
const certUrl = `${BASE}/sertifikat/${CERT}`;
console.log(`Fixture: certnum=${CERT} pemilik=${PEMILIK}`);

// ===== 1. API templatelist: array polos + field lengkap =====
const listJson = await (await fetch(`${API}/templatelist`)).json();
const arrOk = Array.isArray(listJson);
const barA = arrOk && listJson.find((r) => Number(r.id) === Number(ID_A));
ok("API templatelist → array polos", arrOk);
ok(
  "field lengkap {id,nama,file,aktif,utama}",
  !!barA && barA.nama === NAMA_A && barA.file === ASSET && Number(barA.utama) === 1 && Number(barA.aktif) === 1,
  JSON.stringify(barA ?? "-"),
);

// Guard edittemplate: utama tak boleh mati (400 ramah)
const g1 = await fetch(`${API}/edittemplate`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ id: ID_A, aktif: "0" }),
});
ok("guard: nonaktifkan template utama → 400", g1.status === 400, String(g1.status));
const g2 = await fetch(`${API}/edittemplate`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ id: ID_A, utama: "0", aktif: "0" }),
});
ok("guard: lepas utama + nonaktif sekaligus → 400", g2.status === 400, String(g2.status));

const browser = await chromium.launch();

// Latar lembar: src <img> pertama di .pa-sertifikat (next-image optimizer
// menyisakan nama file di parameter url). Halaman guest segar per cek.
async function latar(b, url) {
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const src = await page.locator(".pa-sertifikat img").first().getAttribute("src");
  await page.close();
  return src;
}

// ===== 2. Guest: resolusi background + tanpa picker =====
const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let src = await latar(browser, certUrl);
ok("tanpa param → latar template utama (A)", (src ?? "").includes(FILE_A), (src ?? "").slice(0, 90));
src = await latar(browser, `${certUrl}?tpl=${ID_B}`);
ok(`?tpl=B → latar template B`, (src ?? "").includes(FILE_B), (src ?? "").slice(0, 90));
src = await latar(browser, `${certUrl}?tpl=999`);
ok("?tpl=999 (tak valid) → fallback latar utama (A)", (src ?? "").includes(FILE_A), (src ?? "").slice(0, 90));
ok("guest: picker template TIDAK tampil", (await guest.getByRole("heading", { name: "Bagikan Sertifikat" }).count()) === 0);
await guest.close();

// ===== 3. Pemilik: picker + ganti latar + tombol share =====
const tokenPemilik = await signToken({ userId: Number(PEMILIK), name: "Pemilik QA", role: "USER" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.addCookies([{ name: "pa_session", value: tokenPemilik, url: BASE }]);
const page = await ctx.newPage();
await page.goto(certUrl, { waitUntil: "networkidle" });
ok("pemilik: picker tampil", (await page.getByRole("heading", { name: "Bagikan Sertifikat" }).count()) === 1);
ok("pemilik: tombol Salin Tautan ada", (await page.getByRole("button", { name: "Salin Tautan" }).count()) === 1);
ok("pemilik: tombol Bagikan WhatsApp ada", (await page.getByRole("button", { name: "Bagikan WhatsApp" }).count()) === 1);

await page.locator("button", { hasText: NAMA_B }).first().click();
await page.waitForURL(new RegExp(`[?&]tpl=${ID_B}`), { timeout: 15000 });
await page.waitForLoadState("networkidle");
ok("klik tile B → URL ber-param ?tpl", page.url().includes(`tpl=${ID_B}`), page.url());
src = await page.locator(".pa-sertifikat img").first().getAttribute("src");
ok("klik tile B → lembar berganti latar B", (src ?? "").includes(FILE_B), (src ?? "").slice(0, 90));

await page.locator("button", { hasText: "Bawaan" }).first().click();
await page.waitForURL((u) => !u.searchParams.has("tpl"), { timeout: 15000 });
await page.waitForLoadState("networkidle");
ok("klik Bawaan → param hilang", !page.url().includes("tpl="), page.url());
src = await page.locator(".pa-sertifikat img").first().getAttribute("src");
ok("klik Bawaan → kembali latar utama (A)", (src ?? "").includes(FILE_A), (src ?? "").slice(0, 90));
await ctx.close();

// ===== 4. Admin UI: tambah → utama → lepas → nonaktif → hapus =====
const tokenAdmin = await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 });
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminCtx.addCookies([{ name: "pa_session", value: tokenAdmin, url: BASE }]);
const admin = await adminCtx.newPage();
await admin.addInitScript(() => {
  // auto-klik tombol konfirmasi modal ConfirmSubmit (pola admin-check)
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

await admin.goto(`${BASE}/admin/template-sertifikat`, { waitUntil: "networkidle" });
ok("admin: halaman Template Sertifikat termuat", (await admin.locator("h1", { hasText: "Template Sertifikat" }).count()) === 1);
ok("admin: kotak panduan + tautan unduh contoh ada", (await admin.locator("a[href='/images/sertifikat/bg.png']").count()) === 1);
ok("admin: fixture A & B terlihat di tabel", (await admin.locator("tr", { hasText: NAMA_A }).count()) === 1 && (await admin.locator("tr", { hasText: NAMA_B }).count()) === 1);

// Tambah C (upload file nyata via uploadcover)
await admin.click("summary:has-text('Tambah Template')");
await admin.locator("details input[name='nama']").fill(NAMA_C);
await admin.locator("details input[type='file']").setInputFiles("/tmp/test-cover.jpg");
await admin.locator("details button[type='submit']:has-text('Tambah Template')").click();
await admin.waitForURL(/\/admin\/template-sertifikat\?created=1$/, { timeout: 30000 });
ok("admin: tambah template sukses (banner created)", true);
let rowC = rows(`SELECT id,file FROM template_sertifikat WHERE nama='${NAMA_C}'`);
if (rowC.length === 0) await new Promise((r) => setTimeout(r, 1500)), (rowC = rows(`SELECT id,file FROM template_sertifikat WHERE nama='${NAMA_C}'`));
const [ID_C, FILE_C] = rowC[0];
ok("admin: baris C ter-insert + file ter-upload", !!ID_C && !!FILE_C && FILE_C !== ASSET, `C=${ID_C} file=${FILE_C}`);

// Picker pemilik kini menampilkan C
const cekPickerC = async (diharapkan) => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  c.addCookies([{ name: "pa_session", value: tokenPemilik, url: BASE }]);
  const p = await c.newPage();
  await p.goto(certUrl, { waitUntil: "networkidle" });
  const n = await p.locator(`button:has-text('${NAMA_C}')`).count();
  await c.close();
  return diharapkan ? n === 1 : n === 0;
};
ok("pemilik: template C muncul di picker", await cekPickerC(true));

// Edit C: jadikan utama → default sertifikat berganti
await admin.goto(`${BASE}/admin/template-sertifikat/${ID_C}/edit`, { waitUntil: "networkidle" });
await admin.locator("input[name='nama']").fill(`${NAMA_C} (edit)`);
await admin.locator("input[name='utama']").check();
await admin.locator("button[type='submit']:has-text('Simpan Perubahan')").click();
await admin.waitForURL(/\/admin\/template-sertifikat\?saved=1$/, { timeout: 30000 });
ok("admin: edit nama + set utama sukses", true);
const utamaC = rows(`SELECT utama,aktif FROM template_sertifikat WHERE id=${ID_C}`)[0];
const utamaLain = rows(`SELECT COUNT(*) FROM template_sertifikat WHERE utama=1 AND id<>${ID_C}`)[0][0];
ok("DB: C satu-satunya utama & aktif", utamaC[0] === "1" && utamaC[1] === "1" && utamaLain === "0", JSON.stringify(utamaC));
src = await latar(browser, certUrl);
ok("set utama C → sertifikat default berganti latar C", (src ?? "").includes(FILE_C), (src ?? "").slice(0, 90));

// Lepas utama (aktif tetap) → tidak ada utama → fallback bg.png
await admin.goto(`${BASE}/admin/template-sertifikat/${ID_C}/edit`, { waitUntil: "networkidle" });
await admin.locator("input[name='utama']").uncheck();
await admin.locator("button[type='submit']:has-text('Simpan Perubahan')").click();
await admin.waitForURL(/\/admin\/template-sertifikat\?saved=1$/, { timeout: 30000 });
src = await latar(browser, certUrl);
ok("lepas utama → default fallback bg.png bawaan", (src ?? "").includes("bg.png"), (src ?? "").slice(0, 90));

// Nonaktifkan C → hilang dari picker pemilik
await admin.goto(`${BASE}/admin/template-sertifikat/${ID_C}/edit`, { waitUntil: "networkidle" });
await admin.locator("input[name='aktif']").uncheck();
await admin.locator("button[type='submit']:has-text('Simpan Perubahan')").click();
await admin.waitForURL(/\/admin\/template-sertifikat\?saved=1$/, { timeout: 30000 });
ok("pemilik: C nonaktif hilang dari picker", await cekPickerC(false));

// Hapus C via modal konfirmasi
await admin.goto(`${BASE}/admin/template-sertifikat`, { waitUntil: "networkidle" });
await admin.locator("tr", { hasText: `${NAMA_C} (edit)` }).locator("button:has-text('Hapus')").click();
await admin.waitForURL(/\/admin\/template-sertifikat\?deleted=1$/, { timeout: 30000 });
ok("admin: hapus C sukses (banner deleted)", true);
ok("DB: baris C terhapus", rows(`SELECT COUNT(*) FROM template_sertifikat WHERE id=${ID_C}`)[0][0] === "0");
await adminCtx.close();

// ===== 5. Cleanup: fixture rows + file upload (nama SPESIFIK dari DB) =====
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM template_sertifikat WHERE id IN (${ID_A},${ID_B})" 2>/dev/null`);
ok("cleanup: fixture A & B dihapus dari DB", true);
try {
  execSync(`rm -f '/opt/homebrew/var/www/restApiPohonasuh/public/assets/${FILE_C}'`);
  ok(`cleanup: file upload dihapus (spesifik: ${FILE_C})`, true);
} catch {
  ok("cleanup: file upload dihapus", false, FILE_C);
}
src = await latar(browser, certUrl);
ok("akhir: sertifikat kembali bg.png bawaan", (src ?? "").includes("bg.png"), (src ?? "").slice(0, 90));

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);

