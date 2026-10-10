// E2E upload foto lokasi/desa di admin (kelola Data Lokasi):
// edit form dapat FileInput + preview "Foto Saat Ini"; unggahan masuk
// public/upload/lokasi + desa.foto terisi URL; halaman publik /lokasi ikut
// memakai foto unggahan; centang hapus → foto balik fallback pohon pertama.
// Guard backend: ekstensi ditolak 400. Semua data uji dipulihkan di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
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

// fixture PNG 1×1
fs.writeFileSync(
  "/tmp/lokasi-foto-e2e.png",
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);
fs.writeFileSync("/tmp/lokasi-foto-e2e.txt", "bukan gambar");

// desa fixture: aktif + punya pohon ber-foto (fallback pasti ada)
const [DESA_ID, DESA] = rows(
  "SELECT d.id, d.nama FROM desa d WHERE d.aktif=1 AND EXISTS (SELECT 1 FROM data_pohon p WHERE p.desa=d.nama AND IFNULL(p.foto_pohon,'')<>'') ORDER BY d.id LIMIT 1",
)[0];
if (!DESA_ID) throw new Error("butuh desa aktif ber-pohon");
const snapFoto = rows(
  `SELECT CONCAT('[',IFNULL(foto,''),']') FROM desa WHERE id=${DESA_ID}`,
)[0][0];
const FOTO_AWAL = snapFoto.slice(1, -1);
console.log(`desa fixture: ${DESA} (id=${DESA_ID}) foto_awal=${snapFoto}`);

// cleanup sisa run gagal
rows(`UPDATE desa SET foto=${FOTO_AWAL === "" ? "NULL" : `'${FOTO_AWAL}'`} WHERE id=${DESA_ID}`);
execSync(`rm -f ${LARAVEL}/public/upload/lokasi/lokasi_${DESA}_*`);
rows(`DELETE FROM desa WHERE nama LIKE 'e2efoto%'`);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const token = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

// ===== 1. Form edit: FileInput + preview fallback =====
await page.goto(`${BASE}/admin/lokasi/${DESA_ID}/edit`, { waitUntil: "networkidle" });
assert((await page.locator('form input[type=file]').count()) === 1, "form punya input file");
const body0 = await page.textContent("main");
assert(body0.includes("Foto Saat Ini"), "preview Foto Saat Ini tampil");
assert(
  body0.includes("Otomatis dari foto pohon pertama desa"),
  "keterangan fallback (belum ada foto kustom)",
);
assert(
  (await page.locator('input[name="hapusFoto"]').count()) === 0,
  "checkbox hapus belum muncul (foto kustom kosong)",
);
assert(
  (await page.locator("main img").first().getAttribute("src")).length > 0,
  "thumbnail preview termuat",
);

// ===== 2. Unggah foto → simpan =====
await page.setInputFiles('input[type=file]', "/tmp/lokasi-foto-e2e.png");
assert((await page.locator('[data-testid="file-ok"]').count()) === 1, "file valid terdeteksi UI");
await page.click("button:has-text('Simpan Perubahan')");
await page.waitForURL(/saved=1/, { timeout: 30000 });
const fotoDb = await waitForDb(
  () =>
    rows(`SELECT foto FROM desa WHERE id=${DESA_ID} AND foto LIKE '%/upload/lokasi/lokasi_%'`)[0]?.[0],
  20000,
  "desa.foto upload",
);
assert(!!fotoDb, `desa.foto = ${fotoDb}`);
assert(fs.existsSync(`${LARAVEL}/public/upload/lokasi/`), "folder upload/lokasi dibuat");
const namaFile = fotoDb.split("/").pop();
assert(fs.existsSync(`${LARAVEL}/public/upload/lokasi/${namaFile}`), `file fisik ada (${namaFile})`);

// ===== 3. Form edit: mode foto kustom =====
await page.goto(`${BASE}/admin/lokasi/${DESA_ID}/edit`, { waitUntil: "networkidle" });
const body1 = await page.textContent("main");
assert(body1.includes("Foto kustom dipakai"), "keterangan foto kustom tampil");
assert(
  (await page.locator('input[name="hapusFoto"]').count()) === 1,
  "checkbox hapus foto kustom muncul",
);
const urlVal = await page.locator('input[name="fotoUrl"]').inputValue();
assert(urlVal.includes("/upload/lokasi/"), `kolom URL terisi URL unggahan (${urlVal.slice(0, 60)}…)`);

// ===== 4. Halaman publik /lokasi pakai foto unggahan =====
await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
const srcCard = decodeURIComponent(
  await page.locator("main img").first().getAttribute("src"),
);
assert(srcCard.includes("/upload/lokasi/"), `kartu /lokasi pakai foto unggahan (${srcCard.slice(0, 70)}…)`);

// ===== 5. Hapus foto kustom → balik fallback =====
await page.goto(`${BASE}/admin/lokasi/${DESA_ID}/edit`, { waitUntil: "networkidle" });
await page.locator('input[name="hapusFoto"]').check();
await page.click("button:has-text('Simpan Perubahan')");
await page.waitForURL(/saved=1/, { timeout: 30000 });
await waitForDb(() => {
  const v = rows(
    `SELECT CONCAT('[',IFNULL(foto,''),']') FROM desa WHERE id=${DESA_ID}`,
  )[0][0];
  return v === "[]" ? "null" : null;
}, 15000, "desa.foto null");
assert(true, "desa.foto kembali NULL");
await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
const srcCard2 = decodeURIComponent(
  await page.locator("main img").first().getAttribute("src"),
);
assert(!srcCard2.includes("/upload/lokasi/"), "kartu /lokasi balik ke foto fallback pohon");

// ===== 6. Guard backend: ekstensi ditolak =====
const guard = execSync(
  `curl -s -F "id=${DESA_ID}" -F "nama=${DESA}" -F "foto=@/tmp/lokasi-foto-e2e.txt" ${API}/editlokasi`,
).toString();
assert(guard.includes("400") && guard.includes("Ekstensi"), `ekstensi .txt ditolak: ${guard}`);

// ===== 7. Jalur tambah lokasi + foto =====
await page.goto(`${BASE}/admin/lokasi`, { waitUntil: "networkidle" });
await page.click("summary:has-text('Tambah Lokasi')");
await page.fill('details form input[name="nama"]', "e2efotolok");
await page.setInputFiles('details form input[type=file]', "/tmp/lokasi-foto-e2e.png");
await page.click('details form button:has-text("Tambah Lokasi")');
await page.waitForURL(/saved=1/, { timeout: 30000 });
const baru = await waitForDb(
  () => rows(`SELECT id, foto FROM desa WHERE nama='e2efotolok' AND foto LIKE '%/upload/lokasi/lokasi_%'`)[0],
  20000,
  "desa baru",
);
assert(!!baru, `tambah lokasi ber-foto (id=${baru[0]})`);

// ===== cleanup =====
rows(`DELETE FROM desa WHERE id=${baru[0]}`);
execSync(`rm -f ${LARAVEL}/public/upload/lokasi/lokasi_e2efotolok_*`);
execSync(`rm -f ${LARAVEL}/public/upload/lokasi/lokasi_${DESA}_*`);
assert(
  rows(`SELECT COUNT(*) FROM desa WHERE nama LIKE 'e2efoto%'`)[0][0] === "0",
  "cleanup desa uji",
);
assert(
  rows(`SELECT CONCAT('[',IFNULL(foto,''),']') FROM desa WHERE id=${DESA_ID}`)[0][0] === snapFoto,
  "foto desa fixture dipulihkan",
);

await browser.close();
console.log("\n=== UPLOAD FOTO LOKASI LULUS E2E ===");
