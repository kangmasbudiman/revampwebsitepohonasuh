// Smoke produksi Laporan Kegiatan (pohonasuh.io): petugas (login asli) buat
// laporan + unggah foto → admin (JWT AUTH_SECRET VPS) melihatnya + filter
// petugas → tampilan mobile kartu → hapus laporan + bersihkan file.
// Jalankan: node scripts/uji-vps-laporan.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const HARI = new Date().toISOString().slice(0, 10);
const JUDUL = `UJI VPS Laporan ${Date.now()}`;

const assert = (c, m) => {
  if (!c) { console.error("✗ GAGAL:", m); process.exit(1); }
  console.log("PASS —", m);
};
const vps = (sql) =>
  execSync(`ssh pohonasuh-vps "docker exec pohonasuh-mysql mysql -uroot -p'Pohonassuh2026#' pohonasuh -N -e \\"${sql.replace(/"/g, '\\\\"')}\\" 2>/dev/null"`).toString().trim();
const vpsShell = (cmd) =>
  execSync(`ssh pohonasuh-vps "${cmd}"`).toString().trim();

// bersihkan sisa run gagal sebelum mulai
vps(`DELETE lf FROM laporan_foto lf JOIN laporan_kegiatan lk ON lk.id=lf.idlaporan WHERE lk.judul LIKE 'UJI VPS Laporan%'`);
vps(`DELETE FROM laporan_kegiatan WHERE judul LIKE 'UJI VPS Laporan%'`);
vpsShell("rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/laporan/laporan_*.png /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/laporan/laporan_*.jpg /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/laporan/laporan_*.webp 2>/dev/null");

const browser = await chromium.launch();

// ================= SISI PETUGAS (login asli) =================
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`${BASE}/masuk`);
await p.fill("#email", "petugastes2026@yahoo.com");
await p.fill("#password", "Petugas1234");
await p.click("button[type=submit]");
await p.waitForURL(/\/admin/, { timeout: 30000 });
assert(true, `login petugas → ${p.url()}`);

await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
const nav = await p.locator("aside nav a").allTextContents();
assert(
  nav.length === 3 && nav.includes("Laporan Kegiatan"),
  `sidebar petugas 3 menu termuat (${nav})`,
);

// buat laporan → halaman edit (mode galeri)
await p.click("summary:has-text('Tambah Laporan')");
await p.fill('details form input[name="judul"]', JUDUL);
await p.selectOption('details form select[name="jenis"]', "pemantauan");
await p.fill('details form input[name="tanggal"]', HARI);
const desaVal = await p.locator('details form select[name="desa"] option').nth(1).getAttribute("value");
await p.selectOption('details form select[name="desa"]', desaVal);
await p.fill('details form textarea[name="isi"]', "Smoke test laporan kegiatan produksi.");
await p.click("details form button:has-text('Simpan Laporan')");
await p.waitForURL(/\/admin\/laporan\/\d+\/edit\?created=1/, { timeout: 30000 });
const ID = Number(p.url().match(/\/admin\/laporan\/(\d+)\/edit/)[1]);
assert(!!ID, `laporan dibuat id=${ID}`);

// unggah 1 foto (PNG 1×1)
await p.setInputFiles('form:has(input[name="idlaporan"]) input[type=file]', {
  name: "uji-laporan.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
});
await p.click('form:has(input[name="idlaporan"]) button:has-text("Unggah Foto")');
let fotoRow = null;
for (let i = 0; i < 20 && !fotoRow; i++) {
  await p.waitForTimeout(500);
  const r = vps(`SELECT id,url FROM laporan_foto WHERE idlaporan=${ID}`);
  if (r) fotoRow = r.split("\t");
}
assert(!!fotoRow, `foto tersimpan di DB (id=${fotoRow?.[0]})`);
const http = await fetch(fotoRow[1]);
assert(http.status === 200 && (http.headers.get("content-type") ?? "").includes("image/"), `file tersaji via URL rest.pohonasuh.io (${http.status})`);

// daftar: desktop tabel + baris; lalu mobile kartu
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(await p.locator("table").first().isVisible(), "desktop: tabel tampil");
assert((await p.locator("a", { hasText: JUDUL }).count()) >= 1, "baris laporan tampil");
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(!(await p.locator("table").first().isVisible()), "mobile 390px: tabel tersembunyi");
assert(await p.locator("div.rounded-2xl.p-4", { hasText: JUDUL }).first().isVisible(), "mobile 390px: kartu laporan tampil");

// ================= SISI ADMIN (JWT AUTH_SECRET VPS) =================
const secretB64 = vpsShell("grep -o 'AUTH_SECRET=.*' /var/www/apps/pohonasuh/frontend/.env.production")
  .replace("AUTH_SECRET=", "").replace(/^\"|\"$/g, "");
const secret = new TextEncoder().encode(secretB64);
const tok = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30m").sign(secret);
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctxA.addCookies([{ name: "pa_session", value: tok, url: BASE }]);
const a = await ctxA.newPage();
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await a.locator("main", { hasText: JUDUL }).count()) >= 1,
  "admin melihat laporan buatan petugas",
);
assert((await a.locator('select[aria-label="Filter petugas"]').count()) === 1, "admin punya filter petugas");

// ================= CLEANUP: hapus via UI petugas =================
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(`${BASE}/admin/laporan/${ID}/edit`, { waitUntil: "networkidle" });
// auto-klik tombol konfirmasi modal saat muncul (pola admin-check)
await p.evaluate(() => {
  new MutationObserver(() => {
    document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
      if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
await p.click('form:has(input[name="id"]) button:has-text("Hapus Laporan")');
await p.waitForURL(/\/admin\/laporan\?deleted=1/, { timeout: 30000 });
assert(vps(`SELECT COUNT(*) FROM laporan_kegiatan WHERE id=${ID}`) === "0", "laporan terhapus dari DB");
assert(vps(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`) === "0", "foto ikut terhapus");
const namaFile = fotoRow[1].split("/").pop();
vpsShell(`rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/laporan/${namaFile}`);
assert(vps("SELECT COUNT(*) FROM laporan_kegiatan WHERE judul LIKE 'UJI VPS Laporan%'") === "0", "cleanup: 0 laporan uji tersisa");

// logout petugas (simpan cookie QA tetap bersih)
await p.locator("aside form button:has-text('Keluar')").click();
await p.waitForURL(`${BASE}/`, { timeout: 30000 });

await browser.close();
console.log("\n=== SMOKE LAPORAN KEGIATAN PRODUKSI LULUS ===");
