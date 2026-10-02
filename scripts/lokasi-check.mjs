// E2E fitur admin "Data Lokasi" (paritas Admin | Data Lokasi web lama):
// tabel+search, tambah/edit (cascade nama), toggle aktif (efek halaman publik),
// hapus + guard 409 desa berpohon, peta sebaran. JWT diinjeksi (pola adopsi-check).
// Data dev dikembalikan ke keadaan semula di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
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

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());

// ================= 1. Tabel + search =================
// bersihkan sisa run gagal sebelumnya agar penghitungan konsisten
rows(`DELETE FROM data_pohon WHERE idpohon='UJ001'`);
rows(`DELETE FROM desa WHERE nama IN ('uji e2e lokasi','uji e2e rename')`);
const TOTAL = Number(rows("SELECT COUNT(*) FROM desa")[0][0]);
await page.goto(`${BASE}/admin/lokasi`, { waitUntil: "networkidle" });
await page.locator("table tbody tr").first().waitFor({ timeout: 30000 });
assert(
  (await page.locator("table tbody tr").count()) === TOTAL,
  `semua lokasi tampil (${TOTAL} baris)`,
);
assert(
  (await page.locator("aside nav a", { hasText: "Data Lokasi" }).count()) === 1,
  "menu Data Lokasi di sidebar",
);

const cari = page.locator("input[placeholder^='Cari nama / kode']");
await cari.fill("rantau");
await page.waitForTimeout(300);
assert((await page.locator("table tbody tr").count()) === 1, "search 'rantau' → 1 baris rantaukermas");
assert((await page.locator("table tbody tr").locator("a[href='/lokasi/rantaukermas']").count()) === 1, "link desa → /lokasi/rantaukermas");
await cari.fill("");
await page.waitForTimeout(300);

// ================= 2. Tambah via UI =================
await page.click("summary:has-text('Tambah Lokasi')");
await page.locator("form input[name='nama']").fill("uji e2e lokasi");
await page.locator("form input[name='label']").fill("Uji E2E Lokasi");
await page.locator("form input[name='kode_cert']").fill("UJL");
await page.locator("form input[name='kode_pohon']").fill("UJ");
await page.locator("form input[name='kecamatan']").fill("Alam Barajo");
await page.locator("form input[name='kabupaten']").fill("Kota Jambi");
await page.locator("form input[name='provinsi']").fill("Jambi");
await page.locator("form input[name='skema']").fill("Hutan Desa (Village Forest)");
await page.locator("form button:has-text('Tambah Lokasi')").click();
await page.waitForURL("**/admin/lokasi?saved=1", { timeout: 30000 });

const [NEW_ID] = rows("SELECT id FROM desa WHERE nama='uji e2e lokasi'")[0];
assert(Boolean(NEW_ID), `desa tersimpan di DB (id ${NEW_ID})`);
assert(
  rows("SELECT kode_cert, skema, aktif FROM desa WHERE id=" + NEW_ID)[0].join("|") ===
    "UJL|Hutan Desa (Village Forest)|1",
  "kode cert/skema/aktif tersimpan benar",
);

await page.goto(`${BASE}/admin/lokasi`, { waitUntil: "networkidle" });
await cari.fill("uji e2e");
await page.waitForTimeout(300);
assert((await page.locator("table tbody tr").count()) === 1, "baris baru muncul di tabel");

// tampil di halaman publik (aktif=1)
await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
assert(
  (await page.locator("main a[href='/lokasi/uji-e2e-lokasi']").count()) >= 1,
  "desa aktif tampil di /lokasi publik",
);

// ================= 3. Edit + cascade nama =================
rows(
  "INSERT INTO data_pohon (idpohon, desa, localname, diameter, adopted, nama, slope, soil, keterangan, harga, beku, qrcode) VALUES ('UJ001','uji e2e lokasi','Pohon Uji',40,'available','Uji','','','',100000,'','')",
);
await page.goto(`${BASE}/admin/lokasi/${NEW_ID}/edit`, { waitUntil: "networkidle" });
assert(
  (await page.locator("input[name='nama']").inputValue()) === "uji e2e lokasi",
  "edit page terisi (nama)",
);
await page.locator("input[name='nama']").fill("uji e2e rename");
await page.locator("input[name='provinsi']").fill("Jambi Barat");
await page.click("button:has-text('Simpan Perubahan')");
await page.waitForURL("**/admin/lokasi?saved=1", { timeout: 30000 });
assert(
  rows("SELECT provinsi FROM desa WHERE id=" + NEW_ID)[0][0] === "Jambi Barat",
  "edit provinsi tersimpan",
);
assert(
  rows("SELECT desa FROM data_pohon WHERE idpohon='UJ001'")[0][0] === "uji e2e rename",
  "cascade: pohon UJ001 ikut pindah ke nama desa baru",
);

// ================= 4. Toggle aktif → efek publik =================
await page.goto(`${BASE}/admin/lokasi`, { waitUntil: "networkidle" });
await cari.fill("uji e2e rename");
await page.locator("table tbody tr").first().waitFor({ timeout: 10000 });
await page.locator("button[aria-label='Nonaktifkan uji e2e rename']").click();
await page.waitForURL("**/admin/lokasi?saved=1", { timeout: 30000 });
assert(rows("SELECT aktif FROM desa WHERE id=" + NEW_ID)[0][0] === "0", "aktif=0 di DB");

await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
assert(
  (await page.locator("main a[href='/lokasi/uji-e2e-rename']").count()) === 0,
  "desa nonaktif hilang dari /lokasi publik",
);
await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
assert(
  (await page.locator(`a[href='/pohon?lokasi=uji-e2e-rename']`).count()) === 0,
  "chip lokasi nonaktif hilang dari /pohon",
);
assert(
  (await page.locator("text=/\\bpohon tersedia/").first().isVisible()),
  "halaman /pohon tetap sehat",
);

// ================= 5. Hapus: guard lalu sukses =================
// guard: masih ada pohon UJ001
await page.goto(`${BASE}/admin/lokasi`, { waitUntil: "networkidle" });
await cari.fill("uji e2e rename");
await page.locator("table tbody tr").first().waitFor({ timeout: 10000 });
await page.click("table tbody tr button:has-text('Hapus')");
await page.waitForURL("**/admin/lokasi?error=*", { timeout: 30000 });
assert(
  (await page.locator("text=/Masih ada 1 pohon/").count()) >= 1,
  "hapus diblok 409 bila masih ada pohon",
);
assert(
  rows("SELECT COUNT(*) FROM desa WHERE id=" + NEW_ID)[0][0] === "1",
  "desa masih ada di DB (guard)",
);

// guard desa asli berpohon: rantaukermas (856 pohon)
await cari.fill("rantaukermas");
await page.locator("table tbody tr").first().waitFor({ timeout: 10000 });
await page.click("table tbody tr button:has-text('Hapus')");
await page.waitForURL("**/admin/lokasi?error=*", { timeout: 30000 });
assert(rows("SELECT COUNT(*) FROM desa WHERE nama='rantaukermas'")[0][0] === "1", "rantaukermas tetap ada (guard)");

// sukses setelah pohon dihapus
rows(`DELETE FROM data_pohon WHERE idpohon='UJ001'`);
await cari.fill("uji e2e rename");
await page.locator("table tbody tr").first().waitFor({ timeout: 10000 });
await page.click("table tbody tr button:has-text('Hapus')");
await page.waitForURL("**/admin/lokasi?deleted=1", { timeout: 30000 });
assert(rows(`SELECT COUNT(*) FROM desa WHERE id=${NEW_ID}`)[0][0] === "0", "desa dummy terhapus di DB");
console.log("✓ cleanup dummy lokasi");

// ================= 6. Peta sebaran (MapLibre + pemilih gaya) =================
await page.goto(`${BASE}/admin/lokasi`, { waitUntil: "networkidle" });
await page.locator(".maplibregl-map").waitFor({ timeout: 30000 });
assert(await page.locator(".maplibregl-map").isVisible(), "peta sebaran (MapLibre) dirender");
await page.waitForTimeout(1500);
await page.screenshot({ path: "screenshots/lokasi-peta.png", fullPage: false });

// ganti gaya → Satelit (bukti fungsional: tile raster Esri benar-benar dimuat)
const tileEsri = page
  .waitForResponse((r) => r.url().includes("arcgisonline.com"), { timeout: 15000 })
  .catch(() => null);
await page.locator("button[aria-label='Gaya peta Satelit']").click();
assert((await tileEsri) !== null, "ganti gaya ke Satelit → tile Esri dimuat");
assert(
  (await page.locator("button[aria-label='Gaya peta Satelit'][aria-pressed='true']").count()) === 1,
  "tombol gaya Satelit ter-tandai aktif",
);
await page.waitForTimeout(800);
await page.screenshot({ path: "screenshots/lokasi-peta-satelit.png", fullPage: false });

// kembali ke Standar
const tileOfm = page
  .waitForResponse((r) => r.url().includes("tiles.openfreemap.org"), { timeout: 15000 })
  .catch(() => null);
await page.locator("button[aria-label='Gaya peta Standar']").click();
assert((await tileOfm) !== null, "ganti gaya kembali ke Standar → tile OpenFreeMap dimuat");

// pin → fokus desa (judul peta berubah)
await page.locator("button[aria-label='Fokuskan peta ke sungaibuluh']").click();
await page.waitForTimeout(1200);
assert(
  (await page.locator("#peta-lokasi h2", { hasText: "sungaibuluh" }).count()) === 1,
  "klik pin → peta fokus ke desa terpilih",
);
await page.screenshot({ path: "screenshots/lokasi-tabel.png", fullPage: false });

await browser.close();
console.log("=== SEMUA TES DATA LOKASI LULUS ===");
