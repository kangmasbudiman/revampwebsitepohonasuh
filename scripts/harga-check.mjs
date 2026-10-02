// E2E fitur admin "Data Harga Pohon" (paritas "Admin | Data Trees Price"
// web lama): tabel hitungan pohon per lokasi × tier harga, filter status,
// cari, pagination, baris Total, donat komposisi harga (ikut filter
// status), bar status pohon per lokasi. Read-only — tanpa mutasi DB.
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

const norm = (s) => s.replace(/\s+/g, "");
const numNorm = (s) => norm(s).replace(/\./g, "");

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

// ================= 1. Tabel + kolom tier =================
const N_DESA = Number(rows("SELECT COUNT(DISTINCT desa) FROM data_pohon")[0][0]);
const TIERS = rows("SELECT DISTINCT harga FROM data_pohon ORDER BY harga").map((r) => Number(r[0]));
const tierLabel = (h) => `${h / 1000}rb`;
const tierCounts = (where) => {
  const [line] = rows(
    `SELECT ${TIERS.map((t) => `SUM(harga=${t})`).join(",")}, COUNT(*) FROM data_pohon ${where}`,
  );
  return line.map(Number);
};

await page.goto(`${BASE}/admin/harga`, { waitUntil: "networkidle" });
await page.locator("table tbody tr").first().waitFor({ timeout: 30000 });
assert(
  (await page.locator("aside nav a", { hasText: "Data Harga Pohon" }).count()) === 1,
  "menu Data Harga Pohon di sidebar",
);
const counter = await page.locator("text=/lokasi$/").first().textContent();
assert(
  counter.replace(/\./g, "").startsWith(String(N_DESA)),
  `counter lokasi sesuai DB (${N_DESA}; tampil "${counter.trim()}")`,
);
for (const t of TIERS) {
  assert(
    (await page.locator(`table thead th:has-text('${tierLabel(t)}')`).count()) === 1,
    `kolom tier ${tierLabel(t)} ada`,
  );
}
assert((await page.locator("table thead th").count()) === 2 + TIERS.length + 1, "jumlah kolom = No+Lokasi+tier+Jumlah");
await page.screenshot({ path: "screenshots/harga-tabel.png", fullPage: false });

// ================= 2. Baris lokasi + Total vs SQL (semua status) =================
const airCellTexts = async () =>
  (await page.locator("table tbody tr:has-text('airtenam')").locator("td").allTextContents()).map(norm);
let cells = await airCellTexts();
let exp = tierCounts("WHERE desa='airtenam'");
assert(
  cells.slice(2, 2 + TIERS.length).every((c, i) => c === String(exp[i])) &&
    cells[cells.length - 1] === String(exp[TIERS.length]),
  `baris airtenam = SQL (${cells.slice(2).join("|")})`,
);

let totalCells = (await page.locator("[data-testid='total-harga'] td").allTextContents()).map(numNorm);
exp = tierCounts("");
assert(
  totalCells.slice(1, 1 + TIERS.length).every((c, i) => c === String(exp[i])),
  `Total per tier = SQL (${totalCells.slice(1, 1 + TIERS.length).join("|")} vs ${exp.join("|")})`,
);
assert(totalCells[totalCells.length - 1] === String(exp[TIERS.length]), `grand total = ${exp[TIERS.length]}`);

// Recharts merender sektor bertahap (di prod build sektor tipis muncul
// ±300ms setelah tabel) — tunggu sampai jumlah sektor stabil mencapai
// ekspektasi sebelum menghitung.
const tungguSektor = async (n) => {
  await page.waitForFunction(
    (min) => document.querySelectorAll("[data-testid='chart-donat'] .recharts-pie-sector").length >= min,
    n,
    { timeout: 5000 },
  );
};
const N_TIER_ISI = tierCounts("").slice(0, TIERS.length).filter((n) => n > 0).length;
await tungguSektor(N_TIER_ISI);
const nSektor = await page.locator("[data-testid='chart-donat'] .recharts-pie-sector").count();
assert(nSektor === N_TIER_ISI, `donat semua status → ${nSektor} sektor (${N_TIER_ISI} tier terisi)`);

// ================= 3. Filter status → tabel + donat + Total =================
await page.selectOption("select[aria-label='Filter status']", "available");
await page.waitForTimeout(400);
cells = await airCellTexts();
exp = tierCounts("WHERE desa='airtenam' AND adopted='available'");
assert(
  cells.slice(2, 2 + TIERS.length).every((c, i) => c === String(exp[i])) &&
    cells[cells.length - 1] === String(exp[TIERS.length]),
  `baris airtenam (available) = SQL (${cells.slice(2).join("|")})`,
);
totalCells = (await page.locator("[data-testid='total-harga'] td").allTextContents()).map(numNorm);
exp = tierCounts("WHERE adopted='available'");
assert(
  totalCells.slice(1, 1 + TIERS.length).every((c, i) => c === String(exp[i])),
  `Total per tier (available) = SQL (${totalCells.slice(1, 1 + TIERS.length).join("|")})`,
);
const N_TIER_AV = tierCounts("WHERE adopted='available'").slice(0, TIERS.length).filter((n) => n > 0).length;
await tungguSektor(N_TIER_AV);
const nSektorAv = await page.locator("[data-testid='chart-donat'] .recharts-pie-sector").count();
assert(nSektorAv === N_TIER_AV, `donat available → ${nSektorAv} sektor (${N_TIER_AV} tier terisi)`);
assert(
  (await page.locator("[data-testid='chart-donat']").textContent()).includes("Tersedia"),
  "chip donat menampilkan status aktif",
);
await page.screenshot({ path: "screenshots/harga-grafik.png", fullPage: false });
await page.selectOption("select[aria-label='Filter status']", "semua");
await page.waitForTimeout(400);

// ================= 4. Bar status per lokasi =================
await page.selectOption("select[aria-label='Filter lokasi bar']", "rantaukermas");
await page.waitForTimeout(500);
assert(
  (await page.locator("select[aria-label='Filter lokasi bar']").inputValue()) === "rantaukermas",
  "bar memilih lokasi rantaukermas",
);
const N_STATUS_RK = Number(
  rows("SELECT COUNT(DISTINCT IFNULL(adopted,'adopted')) FROM data_pohon WHERE desa='rantaukermas'")[0][0],
);
const nBar = await page.locator("[data-testid='chart-bar'] .recharts-bar-rectangle").count();
assert(nBar === N_STATUS_RK, `bar rantaukermas → ${nBar} batang (${N_STATUS_RK} status)`);

// ================= 5. Cari + pagination =================
await page.fill("input[placeholder^='Cari lokasi']", "rantau");
await page.waitForTimeout(300);
const counterCari = await page.locator("text=/lokasi$/").first().textContent();
assert(counterCari.trim().startsWith("1"), `cari "rantau" → 1 lokasi (tampil "${counterCari.trim()}")`);
assert((await page.locator("table tbody tr").count()) === 1, "tabel menampilkan 1 baris");
await page.fill("input[placeholder^='Cari lokasi']", "");
await page.waitForTimeout(300);

const N_PAGE = Math.ceil(N_DESA / 10);
const hal = await page.locator("text=/Hal 1 dari/").first().textContent();
assert(norm(hal) === `Hal1dari${N_PAGE}`, `pagination 10/halaman ("${hal.trim()}" = ${N_PAGE} hal)`);
await page.click("button:has-text('Berikutnya')");
await page.waitForTimeout(200);
assert((await page.locator("table tbody tr").count()) === N_DESA - 10, `hal 2 memuat ${N_DESA - 10} lokasi`);

await browser.close();
console.log("=== SEMUA TES DATA HARGA POHON LULUS ===");
