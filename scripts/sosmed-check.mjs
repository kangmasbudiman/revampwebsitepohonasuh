// Uji pengaturan sosmed dinamis (tabel sosmed): panel admin Pengaturan —
// tambah akun (pilih ikon), edit label, hapus; footer menampilkan ikon +
// label + URL; validasi URL; jumlah akun bebas.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};
const sql = (q) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${q}" 2>/dev/null`).toString().trim();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/masuk?next=%2Fadmin`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click('button[type=submit]');
await page.waitForURL("**/admin", { timeout: 20000 });

await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });

// 1) panel Media Sosial tampil dengan baris seed
ok("judul panel tampil", (await page.locator("h2", { hasText: "Media Sosial" }).count()) === 1);
const awal = Number(sql("SELECT COUNT(*) FROM sosmed"));
ok("ada baris seed (3)", awal === 3, String(awal));
ok(
  "baris ter-render = DB",
  (await page.locator('form[action] button:has-text("Simpan")').count()) >= 3,
);

// 2) validasi: URL tanpa skema ditolak validasi native type=url
const jmlSebelum = Number(sql("SELECT COUNT(*) FROM sosmed"));
await page.fill('form:has(button:has-text("Tambah Akun")) input[name=url]', "tiktok.com/@pohonasuh");
await page.click('button:has-text("Tambah Akun")');
await page.waitForTimeout(500);
ok(
  "URL tanpa http:// dianggap invalid",
  (await page.locator('form:has(button:has-text("Tambah Akun")) input[name=url]:invalid').count()) === 1,
);
ok("DB tak bertambah saat invalid", Number(sql("SELECT COUNT(*) FROM sosmed")) === jmlSebelum);

// 3) tambah akun TikTok
await page.selectOption('form:has(button:has-text("Tambah Akun")) select[name=ikon]', "tiktok");
await page.fill('form:has(button:has-text("Tambah Akun")) input[name=label]', "TikTok");
await page.fill('form:has(button:has-text("Tambah Akun")) input[name=url]', "https://tiktok.com/@pohonasuh_e2e");
await page.click('button:has-text("Tambah Akun")');
await page.waitForSelector("text=Akun sosmed ditambahkan", { timeout: 20000 });
ok("popup sosmedsaved tampil", true);
ok("DB bertambah", Number(sql("SELECT COUNT(*) FROM sosmed")) === jmlSebelum + 1);
const dbTt = sql("SELECT ikon, label FROM sosmed WHERE url LIKE '%pohonasuh_e2e%'").split("\t");
ok("DB ikon tiktok", dbTt[0] === "tiktok", dbTt.join("|"));

// 4) baris baru muncul di panel dengan select ikon = tiktok
await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
const barisTt = page.locator("div", { has: page.locator('input[value="https://tiktok.com/@pohonasuh_e2e"]') }).first();
ok("baris TikTok tampil", (await page.locator('input[value="https://tiktok.com/@pohonasuh_e2e"]').count()) === 1);

// 5) footer: link TikTok + ikon svg
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const linkTt = page.locator('footer a:has-text("TikTok")').first();
ok("footer link TikTok tampil", (await linkTt.count()) === 1);
ok(
  "footer href TikTok benar",
  (await linkTt.getAttribute("href")) === "https://tiktok.com/@pohonasuh_e2e",
);
ok("footer ada ikon svg", (await linkTt.locator("svg").count()) === 1);

// 6) edit label akun TikTok
await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
const rowEdit = page.locator("form").filter({ has: page.locator('input[value="https://tiktok.com/@pohonasuh_e2e"]') });
await rowEdit.locator('input[name=label]').fill("TikTok PA");
await rowEdit.locator('button:has-text("Simpan")').click();
await page.waitForSelector("text=Akun sosmed diperbarui", { timeout: 20000 });
ok("popup diperbarui tampil", true);
ok(
  "DB label berubah",
  sql("SELECT label FROM sosmed WHERE url LIKE '%pohonasuh_e2e%'") === "TikTok PA",
);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
ok("footer label baru", (await page.locator('footer a:has-text("TikTok PA")').count()) === 1);

// 7) hapus akun TikTok (modal konfirmasi)
await page.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
const rowDel = page.locator("div.rounded-xl").filter({ has: page.locator('input[value="https://tiktok.com/@pohonasuh_e2e"]') });
await rowDel.locator('button:has-text("Hapus")').click();
await page.locator("[data-confirm-submit]").click();
await page.waitForSelector("text=Akun sosmed dihapus", { timeout: 20000 });
ok("popup dihapus tampil", true);
ok("DB kembali " + jmlSebelum, Number(sql("SELECT COUNT(*) FROM sosmed")) === jmlSebelum);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
ok("footer tanpa TikTok", (await page.locator("footer a:has-text('TikTok')").count()) === 0);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
