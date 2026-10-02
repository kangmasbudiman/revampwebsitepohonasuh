// E2E fitur admin "Backup Database": guard token API, buat backup dari UI
// (file .sql.gz nyata di server), unduh via browser (magic gzip), uji
// RESTORE nyata ke scratch DB (bandingkan jumlah baris), lalu hapus.
// Scratch DB pa_backup_e2e & file backup dibuat skrip ini sendiri —
// database asli pohonasuh2 TIDAK pernah dimutasi.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = "http://127.0.0.1:8000/api";
const BACKUP_DIR = "/opt/homebrew/var/www/restApiPohonasuh/storage/app/backups";

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
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

// cleanup sisa run gagal sebelum mulai
for (const f of fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sql.gz"))) {
  fs.unlinkSync(`${BACKUP_DIR}/${f}`);
}
rows("DROP DATABASE IF EXISTS pa_backup_e2e");

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

// ================= 1. Guard token di API =================
const resTanpa = await fetch(`${API}/backuplist`);
assert(resTanpa.status === 401, `backuplist tanpa token → 401 (aktual ${resTanpa.status})`);
const resSalah = await fetch(`${API}/backuplist`, { headers: { "X-Backup-Token": "sampah" } });
assert(resSalah.status === 401, `backuplist token salah → 401 (aktual ${resSalah.status})`);
const resTraversal = await fetch(`${API}/backupfile?file=../../.env`, {
  headers: { "X-Backup-Token": "sampah" },
});
assert(resTraversal.status === 401, "guard jalan sebelum validasi nama file");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

// ================= 2. Halaman + empty state =================
await page.goto(`${BASE}/admin/backup`, { waitUntil: "networkidle" });
assert(
  (await page.locator("aside nav a", { hasText: "Backup Database" }).count()) === 1,
  "menu Backup Database di sidebar",
);
assert(
  (await page.getByRole("heading", { name: "Backup Database" }).count()) === 1,
  "judul halaman tampil",
);
assert((await page.locator("table tbody tr").count()) === 1, "tabel render (baris empty state)");

// ================= 3. Buat backup via UI =================
await page.click("button:has-text('Buat Backup Baru')");
await page.locator("text=/Backup berhasil dibuat/").waitFor({ timeout: 30000 });
assert(true, "banner sukses setelah buat backup");
const banner = await page.locator("p:has-text('Backup berhasil dibuat')").textContent();
const namaFile = banner.match(/pohonasuh2-\d{8}-\d{6}\.sql\.gz/)?.[0] ?? "";
assert(/^[a-z0-9_.-]+\.sql\.gz$/.test(namaFile), `nama file valid (${namaFile})`);
const stat = fs.statSync(`${BACKUP_DIR}/${namaFile}`);
assert(stat.size > 10000, `file fisik di server API (${stat.size.toLocaleString("id-ID")} B)`);
const rowCount = await page.locator("table tbody tr:has-text('.sql.gz')").count();
assert(rowCount === 1, "tabel menampilkan 1 file backup");

// ================= 4. Unduh via browser =================
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 30000 }),
  page.locator(`button:has-text('Unduh')`).first().click(),
]);
assert(/\.sql\.gz$/.test(download.suggestedFilename()), `unduhan: ${download.suggestedFilename()}`);
const simpanKe = `/tmp/${namaFile}`;
await download.saveAs(simpanKe);
const buf = fs.readFileSync(simpanKe);
assert(buf[0] === 0x1f && buf[1] === 0x8b, "file unduhan = gzip valid (magic 1f 8b)");

// ================= 5. Uji restore ke scratch DB =================
rows("CREATE DATABASE pa_backup_e2e");
execSync(
  // macOS: zcat hanya terima .Z — WAJIB gzcat utk .gz
  `gzcat "${simpanKe}" | mysql -uroot -pkerabatkotak pa_backup_e2e`,
  { stdio: "pipe" },
);
for (const t of ["data_pohon", "member", "data_adopsi", "kelakuan"]) {
  const a = rows(`SELECT COUNT(*) FROM pa_backup_e2e.${t}`)[0][0];
  const b = rows(`SELECT COUNT(*) FROM pohonasuh2.${t}`)[0][0];
  assert(a === b, `restore ${t}: ${a} baris = asli ${b}`);
}

// ================= 6. Hapus via UI =================
page.once("dialog", (d) => d.accept());
await page.locator(`button:has-text('Hapus')`).first().click();
await page.locator("text=/Backup dihapus/").waitFor({ timeout: 15000 });
assert(!fs.existsSync(`${BACKUP_DIR}/${namaFile}`), "file hilang dari server setelah hapus");
assert((await page.locator("table tbody tr:has-text('.sql.gz')").count()) === 0, "baris hilang dari tabel");

// ================= cleanup =================
fs.unlinkSync(simpanKe);
rows("DROP DATABASE pa_backup_e2e");
await browser.close();
console.log("=== SEMUA TES BACKUP DATABASE LULUS ===");
