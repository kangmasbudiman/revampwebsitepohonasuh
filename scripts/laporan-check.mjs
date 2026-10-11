// E2E Laporan Kegiatan (admin panel, level 1+2): petugas membuat laporan +
// galeri foto, edit, filter daftar, tampilan responsif (desktop tabel /
// mobile kartu), ownership (petugas tak bisa buka laporan orang lain),
// admin melihat semua, hapus foto & laporan. Cleanup penuh di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const LARAVEL = "/opt/homebrew/var/www/restApiPohonasuh";

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

const HARI = new Date().toISOString().slice(0, 10);

// fixture PNG 1×1
fs.writeFileSync(
  "/tmp/laporan-e2e.png",
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

// cleanup sisa run gagal SEBELUM hitung apa pun
rows(`
  DELETE lf FROM laporan_foto lf
  JOIN laporan_kegiatan lk ON lk.id = lf.idlaporan
  WHERE lk.judul LIKE 'E2E Lap%';
  DELETE FROM laporan_kegiatan WHERE judul LIKE 'E2E Lap%';
`);
execSync(`rm -f ${LARAVEL}/public/upload/laporan/laporan_*.png`);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const sign = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime("2h").sign(secret);
const tokPetugas = await sign({ userId: 2683, name: "Petugas Taging", role: "ADMIN", level: 2 });
const tokAdmin = await sign({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" });

// auto-klik tombol konfirmasi modal (pola admin-check)
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

// ===================== SISI PETUGAS =====================
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(ctxP);
ctxP.addCookies([{ name: "pa_session", value: tokPetugas, url: BASE }]);
const p = await ctxP.newPage();

// 1. Menu & halaman
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
const navP = await p.locator("aside nav a").allTextContents();
assert(
  navP.length === 3 && navP.includes("Laporan Kegiatan"),
  `sidebar petugas memuat Laporan Kegiatan (${navP})`,
);
assert(await p.locator("h1", { hasText: "Laporan Kegiatan" }).count() >= 1, "halaman /admin/laporan termuat");

// 2. Tambah laporan → redirect ke halaman edit (mode galeri)
await p.click("summary:has-text('Tambah Laporan')");
await p.fill('details form input[name="judul"]', "E2E Laporan Kegiatan");
await p.selectOption('details form select[name="jenis"]', "pemantauan");
await p.fill('details form input[name="tanggal"]', HARI);
const desaVal = await p
  .locator('details form select[name="desa"] option')
  .nth(1)
  .getAttribute("value");
await p.selectOption('details form select[name="desa"]', desaVal);
await p.fill('details form textarea[name="isi"]', "Uraian kegiatan uji end-to-end.");
await p.click("details form button:has-text('Simpan Laporan')");
await p.waitForURL(/\/admin\/laporan\/\d+\/edit\?created=1/, { timeout: 30000 });
const ID = Number(p.url().match(/\/admin\/laporan\/(\d+)\/edit/)[1]);
assert(!!ID, `laporan dibuat id=${ID}`);
assert(await p.locator("text=Laporan dibuat").count() >= 1, "banner created tampil");

// 3. Upload 2 foto galeri
for (let i = 0; i < 2; i++) {
  await p.setInputFiles('form:has(input[name="idlaporan"]) input[type=file]', "/tmp/laporan-e2e.png");
  await p.click('form:has(input[name="idlaporan"]) button:has-text("Unggah Foto")');
  await waitForDb(
    () => rows(`SELECT id FROM laporan_foto WHERE idlaporan=${ID}`).length === i + 1,
    20000,
    `foto ke-${i + 1}`,
  );
}
assert(true, "2 foto terunggah (DB)");
await p.waitForTimeout(800);
const fileFisik = rows(`SELECT url FROM laporan_foto WHERE idlaporan=${ID}`)
  .map((r) => r[0].split("/").pop());
assert(
  fileFisik.every((f) => fs.existsSync(`${LARAVEL}/public/upload/laporan/${f}`)),
  `file fisik ada (${fileFisik.length})`,
);
assert((await p.locator("main img").count()) >= 2, "grid galeri menampilkan foto");

// 4. Edit judul
await p.fill('form:has(input[name="id"]) input[name="judul"]', "E2E Laporan Kegiatan Edit");
await p.click('form:has(input[name="id"]) button:has-text("Simpan Perubahan")');
await p.waitForURL(/saved=1/, { timeout: 30000 });
assert(
  rows(`SELECT judul FROM laporan_kegiatan WHERE id=${ID}`)[0][0] === "E2E Laporan Kegiatan Edit",
  "edit judul tersimpan di DB",
);

// 5. Daftar + filter (desktop = tabel)
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(await p.locator("table").first().isVisible(), "desktop: tabel tampil");
assert((await p.locator("table").count()) === 1, "desktop: hanya 1 tabel (kartu mobile tersembunyi)");
assert((await p.locator("a", { hasText: "E2E Laporan Kegiatan Edit" }).count()) >= 1, "baris laporan tampil");
await p.selectOption('select[aria-label="Filter jenis kegiatan"]', "pemantauan");
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("1"), "filter jenis pemantauan → 1");
await p.selectOption('select[aria-label="Filter jenis kegiatan"]', "tagging");
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("0"), "filter jenis tagging → 0");
await p.fill('input[aria-label="Cari laporan"]', "E2E Laporan");
await p.selectOption('select[aria-label="Filter jenis kegiatan"]', "");
await p.waitForTimeout(300);
assert((await p.locator('[data-testid="jml-laporan"]').textContent()).includes("1"), "cari judul → 1");
await p.click('button[aria-label="Reset filter"]');
await p.waitForTimeout(300);
assert(
  (await p.locator('[data-testid="jml-laporan"]').textContent()).includes("1"),
  `reset filter mengembalikan daftar (${await p.locator('[data-testid="jml-laporan"]').textContent()})`,
);

// 6. Mobile = kartu, tabel tersembunyi
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
// count() menghitung node DOM — tabel desktop (hidden md:block) tetap ada di
// DOM saat mobile, maka uji visibilitasnya, bukan keberadaannya.
assert(!(await p.locator("table").first().isVisible()), "mobile 390px: tabel tersembunyi");
assert(
  // wrapper tabel desktop juga rounded-2xl — kartu mobile dibedakan kelas p-4
  await p.locator("div.rounded-2xl.p-4", { hasText: "E2E Laporan Kegiatan Edit" }).first().isVisible(),
  "mobile 390px: kartu laporan tampil",
);

// 7. Ownership: laporan milik admin tak terlihat/dibuka petugas
let idAdm = rows(`SELECT id FROM laporan_kegiatan WHERE judul='E2E Laporan Admin'`)[0]?.[0];
if (!idAdm) {
  const r = execSync(
    `curl -s -X POST http://127.0.0.1:8001/api/tambahlaporan -d "idpetugas=2682&judul=E2E Laporan Admin&jenis=tagging&tanggal=${HARI}&isi=laporan milik admin"`,
  ).toString();
  idAdm = Number(r.match(/"id":(\d+)/)?.[1] ?? 0);
}
assert(!!idAdm, `fixture laporan admin id=${idAdm}`);
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await p.locator("main", { hasText: "E2E Laporan Admin" }).count()) === 0,
  "petugas TIDAK melihat laporan milik admin",
);
await p.goto(`${BASE}/admin/laporan/${idAdm}/edit`, { waitUntil: "networkidle" });
assert(
  /404|could not be found/i.test(await p.textContent("body")),
  "petugas buka edit laporan admin → 404",
);

// 8. Hapus satu foto
await p.goto(`${BASE}/admin/laporan/${ID}/edit`, { waitUntil: "networkidle" });
await p.locator('form:has(input[name="idlaporan"]) button:has-text("Hapus")').first().click();
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`)[0][0] === "1",
  20000,
  "sisa 1 foto",
);
assert(true, "hapus 1 foto → sisa 1");

// 9. Hapus laporan (milik sendiri)
await p.click('form:has(input[name="id"]) button:has-text("Hapus Laporan")');
await p.waitForURL(/\/admin\/laporan\?deleted=1/, { timeout: 30000 });
await waitForDb(
  () => rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE id=${ID}`)[0][0] === "0",
  20000,
  "laporan terhapus",
);
assert(true, "laporan milik sendiri terhapus");
assert(rows(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`)[0][0] === "0", "foto ikut terhapus (cascade web)");

// ===================== SISI ADMIN =====================
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
pasangAutoConfirm(ctxA);
ctxA.addCookies([{ name: "pa_session", value: tokAdmin, url: BASE }]);
const a = await ctxA.newPage();
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await a.locator("main", { hasText: "E2E Laporan Admin" }).count()) >= 1,
  "admin melihat laporan miliknya (semua petugas)",
);
assert(
  (await a.locator('select[aria-label="Filter petugas"]').count()) === 1,
  "admin punya filter petugas",
);

// cleanup laporan admin
execSync(
  `curl -s -X POST http://127.0.0.1:8001/api/hapuslaporan -d "id=${idAdm}" > /dev/null`,
);
assert(
  rows(`SELECT COUNT(*) FROM laporan_kegiatan WHERE judul LIKE 'E2E Lap%'`)[0][0] === "0",
  "cleanup: 0 laporan E2E tersisa",
);
assert(
  rows(`SELECT COUNT(*) FROM laporan_foto lf JOIN laporan_kegiatan lk ON lk.id=lf.idlaporan WHERE lk.judul LIKE 'E2E Lap%'`)[0][0] === "0",
  "cleanup: 0 foto E2E tersisa",
);
execSync(`rm -f ${LARAVEL}/public/upload/laporan/laporan_*.png`);

await browser.close();
console.log("\n=== LAPORAN KEGIATAN LULUS E2E ===");
