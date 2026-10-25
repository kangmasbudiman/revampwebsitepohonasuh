// Uji filter diameter halaman publik /pohon: pill rentang (<50 / 50–100 /
// >100 cm), jumlah per rentang = SQL, kombinasi lokasi, kartu menampilkan
// info Ø, paginasi mempertahankan filter, label EN.
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

// Jumlah yang diharapkan aplikasi: available + desa tidak nonaktif +
// rentang diameter (NULL dihitung ke bucket < 50, sama seperti aplikasi).
const sqlRentang = (min, maks, desa = null) => {
  const rentang =
    maks === Infinity
      ? min === 0
        ? "1=1"
        : `dp.diameter >= ${min}`
      : min === 0
        ? `(dp.diameter IS NULL OR dp.diameter < ${maks})`
        : `dp.diameter >= ${min} AND dp.diameter < ${maks}`;
  const lokasi = desa ? ` AND dp.desa='${desa}'` : "";
  return Number(
    sql(
      `SELECT COUNT(*) FROM data_pohon dp WHERE dp.adopted='available' AND ${rentang}` +
        ` AND NOT EXISTS (SELECT 1 FROM desa dd WHERE dd.nama=dp.desa AND dd.aktif=0)${lokasi}`,
    ),
  );
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });

const jml = async () => {
  const m = (await page.textContent("p.mt-6")).match(/(\d+)/);
  return Number(m[1]);
};
const rowDiameter = page.locator("main > div").nth(2);
const pill = (label) => rowDiameter.locator("a", { hasText: label }).first();
const klik = async (label, v) => {
  await pill(label).click();
  await page.waitForURL(new RegExp(`diameter=${v}($|&)`));
  await page.waitForLoadState("networkidle");
};

// 1) baris pill diameter tampil
for (const label of ["Semua Diameter", "< 50 cm", "50–100 cm", "> 100 cm"]) {
  ok(`pill ${label} tampil`, (await pill(label).count()) === 1);
}

// 2) setiap rentang → jumlah = SQL
for (const [label, v, min, maks] of [
  ["< 50 cm", "lt50", 0, 50],
  ["50–100 cm", "50-100", 50, 100],
  ["> 100 cm", "gt100", 100, Infinity],
]) {
  await klik(label, v);
  const ui = await jml();
  const db = sqlRentang(min, maks);
  ok(`rentang ${label} → jumlah = SQL`, ui === db, `${ui} vs ${db}`);
}
ok("URL memuat diameter=gt100", page.url().includes("diameter=gt100"), page.url());

// 3) kartu menampilkan info Ø (rentang > 100 cm pasti punya diameter)
const kartu = page.locator("main a", { hasText: "Ø" }).first();
ok("kartu menampilkan Ø … cm", /Ø \d+ cm/.test((await kartu.textContent()) ?? ""));

// 4) kombinasi: pill desa pertama (baris lokasi) saat filter diameter aktif
const lokasiRow = page.locator("main > div").first();
const pillDesa = lokasiRow.locator("a").nth(1);
await pillDesa.click();
await page.waitForURL(/lokasi=/);
await page.waitForLoadState("networkidle");
const slugDesa = new URL(page.url()).searchParams.get("lokasi");
const dbDesa = sql("SELECT nama FROM desa WHERE aktif=1 ORDER BY id LIMIT 1");
if (slugDesa) {
  const cocokDesa = dbDesa.toLowerCase() === decodeURIComponent(slugDesa).toLowerCase();
  ok("desa pill pertama = desa aktif pertama DB", cocokDesa, `${slugDesa} vs ${dbDesa}`);
  if (cocokDesa) {
    const uiKombinasi = await jml();
    const dbKombinasi = sqlRentang(100, Infinity, dbDesa);
    ok(
      `kombinasi ${dbDesa} + >100 cm → jumlah = SQL`,
      uiKombinasi === dbKombinasi,
      `${uiKombinasi} vs ${dbKombinasi}`,
    );
  }
}

// 5) paginasi mempertahankan diameter (jika > 1 halaman)
const next = page.locator("nav a", { hasText: "Berikutnya" });
if ((await next.count()) === 1) {
  const href = await next.getAttribute("href");
  ok("link Berikutnya membawa diameter", href.includes("diameter=gt100"), href);
  await next.click();
  await page.waitForURL(/page=2/);
  ok(
    "halaman 2 tetap terfilter diameter",
    page.url().includes("diameter=gt100") && page.url().includes("page=2"),
    page.url(),
  );
} else {
  console.log("INFO — hanya 1 halaman, lewati uji paginasi");
}

// 6) label EN via cookie pa_lang
const ctxEn = await browser.newContext();
await ctxEn.addCookies([{ name: "pa_lang", value: "en", url: BASE }]);
const pageEn = await ctxEn.newPage();
await pageEn.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
ok("EN: pill All Diameters", (await pageEn.locator("main a", { hasText: "All Diameters" }).count()) === 1);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
