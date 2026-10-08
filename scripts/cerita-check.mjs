// E2E Cerita Dampak (Impact Stories): CRUD admin (/admin/cerita) + halaman
// publik /cerita-dampak (list + detail) + nav Informasi/footer + section
// testimoni + toggle EN. Fixture dibuat via UI admin lalu dihapus via UI.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/cerita-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
const LARAVEL_ASSETS = "/opt/homebrew/var/www/restApiPohonasuh/public/assets";
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

// ================= Fixture awal: bersihkan sisa + foto uji =================
rows(`DELETE FROM cerita WHERE judul LIKE 'Cerita E2E%'`);
rows(`DELETE FROM testimoni WHERE nama LIKE 'Testimoni E2E%'`);
const FOTO_UJI = "/tmp/cerita-e2e.jpg";
try { fs.unlinkSync(FOTO_UJI); } catch {}
execSync(`sips -s format jpeg -z 400 600 "${LARAVEL_ASSETS}/pohon1.jpg" --out "${FOTO_UJI}" >/dev/null 2>&1`);
assert(fs.existsSync(FOTO_UJI), "foto uji dibuat (sips)");

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

// ================= 1. Sidebar admin memuat menu Cerita Dampak =================
await page.goto(`${BASE}/admin/cerita`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Cerita Dampak", exact: true }).waitFor({ timeout: 30000 });
assert(true, "halaman admin /admin/cerita termuat");
assert(
  (await page.locator('aside nav a[href="/admin/cerita"]').count()) === 1,
  "sidebar admin memuat menu Cerita Dampak",
);
assert((await page.getByText("Belum ada cerita dampak.").count()) === 1, "state kosong tampil");

// ================= 2. Tambah cerita via form (dengan foto) =================
const JUDUL = "Cerita E2E: Hutan Kembali Hijau";
await page.getByText("＋ Tambah Cerita").click();
await page.locator('input[name="judul"]').fill(JUDUL);
await page.locator('input[name="narasumber"]').fill("Pak Aman E2E");
await page.locator('input[name="peran"]').fill("Petani penerima manfaat");
await page.locator('input[name="lokasi"]').fill("Rantau Kermas");
await page.locator('textarea[name="isi"]').fill(
  "Sejak program adopsi pohon hadir di desa kami, hasil kebun mulai membaik dan air sungai jernih kembali. Ini kisah uji end-to-end.",
);
await page.setInputFiles('input[name="foto"]', FOTO_UJI);
await page.getByRole("button", { name: "Tambah Cerita" }).click();
await page.getByText("Cerita tersimpan.").waitFor({ timeout: 30000 });
assert(true, "form tambah cerita sukses (dengan foto)");
const CERITA_ID = Number(one(`SELECT id FROM cerita WHERE judul='${JUDUL.replace(/'/g, "\\'")}'`));
assert(Boolean(CERITA_ID), `cerita tersimpan di DB (id ${CERITA_ID})`);
const FILE_FOTO = one(`SELECT IFNULL(foto,'') FROM cerita WHERE id=${CERITA_ID}`);
assert(FILE_FOTO.startsWith("cover_"), `foto tersimpan via uploadcover (${FILE_FOTO})`);

// ================= 3. Tabel admin menampilkan baris =================
await page.goto(`${BASE}/admin/cerita`, { waitUntil: "networkidle" });
const baris = page.locator("main table tbody tr", { hasText: JUDUL }).first();
await baris.waitFor({ timeout: 15000 });
assert((await baris.getByText("Pak Aman E2E").count()) === 1, "tabel menampilkan narasumber");
assert((await baris.locator("img").count()) === 1, "thumbnail foto tampil di tabel");

// ================= 4. Halaman publik: kartu cerita + nav =================
await page.goto(`${BASE}/cerita-dampak`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Cerita Dampak", exact: true }).waitFor({ timeout: 15000 });
assert(true, "halaman publik /cerita-dampak termuat");
const kartu = page.locator(`a[href="/cerita-dampak/${CERITA_ID}"]`);
await kartu.waitFor({ timeout: 10000 });
assert((await kartu.innerText()).includes("Pak Aman E2E"), "kartu menampilkan narasumber");
assert((await kartu.innerText()).includes("Rantau Kermas"), "kartu menampilkan lokasi");
assert((await kartu.locator("img").count()) === 1, "foto termuat di kartu publik");
assert(
  (await page.locator('header a[href="/cerita-dampak"]').count()) >= 1,
  "dropdown Informasi header memuat link Cerita Dampak",
);
assert(
  (await page.locator('footer a[href="/cerita-dampak"]').count()) === 1,
  "footer memuat link Cerita Dampak",
);
assert((await page.getByText("Kata Mereka").count()) === 0, "section testimoni tersembunyi saat kosong");

// ================= 5. Detail cerita =================
await kartu.click();
await page.waitForURL(`**/cerita-dampak/${CERITA_ID}`);
await page.getByRole("heading", { name: JUDUL, exact: true }).waitFor({ timeout: 10000 });
assert(true, "halaman detail termuat");
assert(
  (await page.getByText("kisah uji end-to-end", { exact: false }).count()) >= 1,
  "isi cerita tampil utuh di detail",
);
assert((await page.locator("article img").count()) === 1, "foto besar tampil di detail");

// ================= 6. Section testimoni muncul saat terisi =================
rows(
  `INSERT INTO testimoni (nama,peran,isi,urutan,created_at,updated_at) VALUES ('Testimoni E2E Donatur','Donatur sejak 2024','Program yang transparan dan nyata dampaknya.',1,NOW(),NOW())`,
);
await page.goto(`${BASE}/cerita-dampak`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Kata Mereka", exact: true }).waitFor({ timeout: 15000 });
assert(
  (await page.getByText("Program yang transparan dan nyata dampaknya.").count()) === 1,
  "section Kata Mereka menampilkan testimoni admin",
);

// ================= 7. Edit cerita =================
await page.goto(`${BASE}/admin/cerita/${CERITA_ID}/edit`, { waitUntil: "networkidle" });
await page.locator('input[name="judul"]').waitFor({ timeout: 15000 });
const valJudul = await page.locator('input[name="judul"]').inputValue();
assert(valJudul === JUDUL, "form edit ter-prefill judul lama");
await page.locator('input[name="judul"]').fill("Cerita E2E: Diperbarui");
await page.getByRole("button", { name: "Simpan Perubahan" }).click();
await page.waitForURL("**/admin/cerita?saved=1", { timeout: 30000 });
assert(true, "edit sukses → redirect ?saved=1");
assert(
  one(`SELECT judul FROM cerita WHERE id=${CERITA_ID}`) === "Cerita E2E: Diperbarui",
  "judul baru tersimpan di DB",
);
await page.goto(`${BASE}/cerita-dampak`, { waitUntil: "networkidle" });
assert(
  (await page.locator(`a[href="/cerita-dampak/${CERITA_ID}"]`, { hasText: "Diperbarui" }).count()) === 1,
  "halaman publik memuat judul baru",
);

// ================= 8. Hapus cerita (modal konfirmasi) =================
await page.goto(`${BASE}/admin/cerita`, { waitUntil: "networkidle" });
const barisHapus = page.locator("main table tbody tr", { hasText: "Diperbarui" }).first();
await barisHapus.getByRole("button", { name: "Hapus" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Ya, Lanjutkan" }).click();
await page.waitForURL("**/admin/cerita?deleted=1", { timeout: 30000 });
assert(true, "hapus sukses → redirect ?deleted=1");
assert(one(`SELECT COUNT(*) FROM cerita WHERE id=${CERITA_ID}`) === "0", "baris terhapus dari DB");

// ================= 9. Locale EN =================
await ctx.addCookies([{ name: "pa_lang", value: "en", url: BASE }]);
await page.goto(`${BASE}/cerita-dampak`, { waitUntil: "networkidle" });
assert(
  (await page.getByRole("heading", { name: "Impact Stories", exact: true }).count()) === 1,
  "locale EN: heading Impact Stories",
);
assert(
  (await page.getByText("No impact stories yet", { exact: false }).count()) >= 1,
  "locale EN: pesan kosong terjemahan",
);
await ctx.clearCookies({ name: "pa_lang" });

// ================= Cleanup: testimoni fixture + file foto upload =================
rows(`DELETE FROM cerita WHERE judul LIKE 'Cerita E2E%'`);
rows(`DELETE FROM testimoni WHERE nama LIKE 'Testimoni E2E%'`);
if (FILE_FOTO) {
  try { fs.unlinkSync(`${LARAVEL_ASSETS}/${FILE_FOTO}`); } catch {}
}
await browser.close();
console.log("\n=== SEMUA TES CERITA DAMPAK LULUS ===");
