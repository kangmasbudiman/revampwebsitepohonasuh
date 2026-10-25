// Uji filter diameter + badge serapan karbon halaman publik /pohon:
// pill rentang (<50 / 50–100 / >100 cm), jumlah per rentang = SQL,
// kombinasi lokasi, kartu menampilkan Ø & badge CO₂, paginasi mempertahankan
// filter, label EN. Navigasi via goto (cache router dev memutar ulang error
// transien), href pill diverifikasi lewat atribut.
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

const buka = async (path) => {
  for (let i = 0; i < 2; i++) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    if (!(await page.locator("main", { hasText: "Gagal memuat" }).count())) return;
  }
  throw new Error(`halaman ${path} tetap error setelah retry`);
};
const jml = async () => {
  const m = (await page.textContent("p.mt-6")).match(/(\d+)/);
  return Number(m[1]);
};
const rowDiameter = page.locator("main > div").nth(2);
const pill = (label) => rowDiameter.locator("a", { hasText: label }).first();

await buka("/pohon");

// 1) baris pill diameter tampil + href rentang
for (const [label, href] of [
  ["Semua Diameter", "/pohon"],
  ["< 50 cm", "/pohon?diameter=lt50"],
  ["50–100 cm", "/pohon?diameter=50-100"],
  ["> 100 cm", "/pohon?diameter=gt100"],
]) {
  ok(`pill ${label} tampil`, (await pill(label).count()) === 1);
  if (href !== "/pohon") {
    const h = await pill(label).getAttribute("href");
    ok(`href ${label} benar`, h === href, h);
  }
}

// 2) setiap rentang → jumlah = SQL
for (const [label, path, min, maks] of [
  ["< 50 cm", "/pohon?diameter=lt50", 0, 50],
  ["50–100 cm", "/pohon?diameter=50-100", 50, 100],
  ["> 100 cm", "/pohon?diameter=gt100", 100, Infinity],
]) {
  await buka(path);
  const ui = await jml();
  const db = sqlRentang(min, maks);
  ok(`rentang ${label} → jumlah = SQL`, ui === db, `${ui} vs ${db}`);
}

// 3) kartu menampilkan info Ø (rentang > 100 cm pasti punya diameter)
const kartu = page.locator("main a", { hasText: "Ø" }).first();
ok("kartu menampilkan Ø … cm", /Ø \d+ cm/.test((await kartu.textContent()) ?? ""));

// 4) kombinasi: desa aktif pertama + >100 cm
const dbDesa = sql("SELECT nama FROM desa WHERE aktif=1 ORDER BY id LIMIT 1");
const slugDesa = sql("SELECT LOWER(nama) FROM desa WHERE aktif=1 ORDER BY id LIMIT 1");
await buka(`/pohon?lokasi=${slugDesa}&diameter=gt100`);
{
  const uiKombinasi = await jml();
  const dbKombinasi = sqlRentang(100, Infinity, dbDesa);
  ok(
    `kombinasi ${dbDesa} + >100 cm → jumlah = SQL`,
    uiKombinasi === dbKombinasi,
    `${uiKombinasi} vs ${dbKombinasi}`,
  );
}

// 5) paginasi mempertahankan diameter
const next = page.locator("nav a", { hasText: "Berikutnya" });
if ((await next.count()) === 1) {
  const href = await next.getAttribute("href");
  ok("link Berikutnya membawa diameter", href.includes("diameter=gt100"), href);
  await buka(href);
  ok("halaman 2 tetap terfilter diameter", page.url().includes("diameter=gt100"));
} else {
  console.log("INFO — hanya 1 halaman, lewati uji paginasi");
}

// 6) badge serapan karbon (katalog /spesies, join nama latin): total badge
// di seluruh halaman ?lokasi=sirukam = jumlah pohon berestimasi di SQL.
const harapanBadge = Number(
  sql(
    "SELECT COUNT(*) FROM data_pohon dp WHERE dp.adopted='available' AND dp.desa='sirukam' AND NOT EXISTS (SELECT 1 FROM desa dd WHERE dd.nama=dp.desa AND dd.aktif=0) AND EXISTS (SELECT 1 FROM species_catalog sc WHERE sc.serapan_karbon IS NOT NULL AND LOWER(TRIM(sc.nama_latin))=LOWER(TRIM(dp.species)))",
  ),
);
let totalBadge = 0;
let formatOk = false;
let pgPertamaBadge = 0;
let jmlPertamaBadge = 0;
for (let pg = 1; ; pg++) {
  await buka(`/pohon?lokasi=sirukam${pg > 1 ? `&page=${pg}` : ""}`);
  const spans = page.locator("main span", { hasText: "kg CO₂/tahun" });
  const n = await spans.count();
  totalBadge += n;
  if (!formatOk && n > 0) {
    formatOk = /^≈ \d+ kg CO₂\/tahun$/.test((await spans.first().textContent()) ?? "");
    pgPertamaBadge = pg;
    jmlPertamaBadge = n;
  }
  if ((await page.locator("nav a", { hasText: "Berikutnya" }).count()) === 0) break;
}
ok("total badge sirukam = SQL", totalBadge === harapanBadge, `${totalBadge} vs ${harapanBadge}`);
ok("format badge ≈ n kg CO₂/tahun", formatOk);

// 7) label EN via cookie pa_lang
const ctxEn = await browser.newContext();
await ctxEn.addCookies([{ name: "pa_lang", value: "en", url: BASE }]);
const pageEn = await ctxEn.newPage();
await pageEn.goto(`${BASE}/pohon`, { waitUntil: "networkidle" });
ok("EN: pill All Diameters", (await pageEn.locator("main a", { hasText: "All Diameters" }).count()) === 1);
await pageEn.goto(
  `${BASE}/pohon?lokasi=sirukam${pgPertamaBadge > 1 ? `&page=${pgPertamaBadge}` : ""}`,
  { waitUntil: "networkidle" },
);
ok(
  "EN: badge kg CO₂/year",
  pgPertamaBadge > 0 &&
    (await pageEn.locator("main span", { hasText: "kg CO₂/year" }).count()) === jmlPertamaBadge,
);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
