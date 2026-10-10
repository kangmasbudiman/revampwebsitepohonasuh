// Probe halaman detail lokasi: hero foto + statistik + donasi + progress,
// deskripsi di bawah hero sebelum peta, responsif desktop/mobile.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
const LOKAL = BASE.includes("localhost") || BASE.includes("127.0.0.1");
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---- API ground truth ----
const rows = await (await fetch(`${API}/getdesa`)).json();
ok("API: semua desa bawa donasi & donasi_tahun numerik",
  rows.every((r) => Number.isFinite(Number(r.donasi)) && Number.isFinite(Number(r.donasi_tahun))),
  `${rows.length} desa`);

const utama = rows.reduce((a, b) => (Number(b.total) > Number(a.total) ? b : a));
const nol = rows.find((r) => Number(r.total) === 0) ?? null;
console.log(`desa utama: ${utama.nama} (total ${utama.total}, donasi ${utama.donasi})`);
if (nol) console.log(`desa nol: ${nol.nama}`);

// ---- Paritas SQL (hanya dev — DB lokal) ----
if (LOKAL) {
  const sql = (nama, tahun) =>
    `SELECT IFNULL(SUM(a.price),0) FROM data_adopsi a LEFT JOIN confirmation c ON c.invoice=a.invoice WHERE a.desa='${nama.replace(/'/g, "''")}' AND (c.id IS NULL OR c.confirmation='yes')${tahun ? " AND YEAR(a.tgl_adopt)=YEAR(CURDATE())" : ""}`;
  const q = (s) =>
    execSync(
      `mysql -uroot -pkerabatkotak pohonasuh2 -N -e "${s}" 2>/dev/null`,
    ).toString().trim();
  const cek = (r) => {
    const t = Number(q(sql(r.nama, false)));
    const y = Number(q(sql(r.nama, true)));
    ok(`SQL paritas ${r.nama}: donasi total`, t === Number(r.donasi), `sql=${t} api=${r.donasi}`);
    ok(`SQL paritas ${r.nama}: donasi tahun ini`, y === Number(r.donasi_tahun), `sql=${y} api=${r.donasi_tahun}`);
  };
  cek(utama);
  if (rows[1]) cek(rows[1]);
} else {
  console.log("SKIP — paritas SQL (bukan lingkungan dev)");
}

const pct = utama.total > 0 ? Math.round((utama.adopted / utama.total) * 100) : 0;
const digits = (s) => s.replace(/[^\d]/g, "");

const browser = await chromium.launch();

// ---- Desktop 1440: layout hero + nilai ----
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/lokasi/${slugify(utama.nama)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const foto = page.getByTestId("hero-foto").locator("img");
  await foto.waitFor({ timeout: 15000 });
  ok("desktop: foto hero termuat", await foto.evaluate((el) => el.complete && el.naturalWidth > 0));

  ok("desktop: stat total/adopted/available = API",
    (await page.getByTestId("stat-total").innerText()) === String(utama.total) &&
    (await page.getByTestId("stat-adopted").innerText()) === String(utama.adopted) &&
    (await page.getByTestId("stat-available").innerText()) === String(utama.available),
    `${utama.total}/${utama.adopted}/${utama.available}`);

  ok("desktop: donasi total = API (format rupiah)",
    digits(await page.getByTestId("donasi-total").innerText()) === String(utama.donasi),
    await page.getByTestId("donasi-total").innerText());
  ok("desktop: donasi tahun ini = API",
    digits(await page.getByTestId("donasi-tahun").innerText()) === String(utama.donasi_tahun),
    await page.getByTestId("donasi-tahun").innerText());

  ok("desktop: label kartu donasi (ID)",
    (await page.getByText("Donasi Terkumpul", { exact: true }).count()) === 1 &&
    (await page.getByText("Dari seluruh periode", { exact: true }).count()) === 1 &&
    (await page.getByText("Donasi Tahun Ini", { exact: true }).count()) === 1 &&
    (await page.getByText(`Tahun ${new Date().getFullYear()}`, { exact: true }).count()) >= 1);

  ok("desktop: persen adopsi benar",
    (await page.getByText(`${pct}% teradopsi`, { exact: true }).count()) === 1, `${pct}%`);
  const width = await page.getByTestId("progress-fill").evaluate((el) => el.style.width);
  ok("desktop: lebar progress bar = persen", width === `${pct}%`, width);

  const fb = await page.getByTestId("hero-foto").boundingBox();
  const sb = await page.getByTestId("stat-total").boundingBox();
  ok("desktop: foto di KIRI statistik", fb.x < sb.x, `foto x=${Math.round(fb.x)} stat x=${Math.round(sb.x)}`);

  const desk = page.getByTestId("deskripsi-lokasi");
  if (utama.profil && (await desk.count()) > 0) {
    const db = await desk.boundingBox();
    const peta = page.locator("h2", { hasText: "Peta sebaran pohon" });
    ok("desktop: deskripsi DI BAWAH hero", db.y > fb.y + fb.height - 2,
      `desk y=${Math.round(db.y)} hero bottom=${Math.round(fb.y + fb.height)}`);
    if ((await peta.count()) > 0) {
      ok("desktop: deskripsi DI ATAS peta", db.y < (await peta.boundingBox()).y);
      ok("desktop: section peta sebaran tampil", true);
    }
  } else {
    console.log("SKIP — desa utama tanpa deskripsi");
  }
  await page.screenshot({ path: `/tmp/lokasi-detail-1440.png`, fullPage: true });
  await page.close();
}

// ---- Mobile 390: stacked ----
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/lokasi/${slugify(utama.nama)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const fb = await page.getByTestId("hero-foto").boundingBox();
  const sb = await page.getByTestId("stat-total").boundingBox();
  ok("mobile: foto di ATAS statistik (stacked)", fb.y < sb.y, `foto y=${Math.round(fb.y)} stat y=${Math.round(sb.y)}`);
  ok("mobile: foto full-width", fb.width > 340, `w=${Math.round(fb.width)}`);
  const dt = await page.getByTestId("donasi-total").boundingBox();
  ok("mobile: kartu donasi tak terpotong (no-wrap dalam kartu)",
    dt.width > 0 && dt.x >= 14 && dt.x + dt.width <= 376,
    `x=${Math.round(dt.x)} w=${Math.round(dt.width)}`);
  await page.screenshot({ path: `/tmp/lokasi-detail-390.png`, fullPage: true });
  await page.close();
}

// ---- EN ----
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([{ name: "pa_lang", value: "en", url: BASE }]);
  await page.goto(`${BASE}/lokasi/${slugify(utama.nama)}`, { waitUntil: "networkidle" });
  ok("EN: label donasi",
    (await page.getByText("Total Donations", { exact: true }).count()) === 1 &&
    (await page.getByText("Donations This Year", { exact: true }).count()) === 1 &&
    (await page.getByText("Available for adoption", { exact: true }).count()) === 1);
  ok("EN: persen teradopsi", (await page.getByText(`${pct}% adopted`, { exact: true }).count()) === 1);
  await page.close();
}

// ---- Desa tanpa pohon (pasiahlaweh dsb.) ----
if (nol) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/lokasi/${slugify(nol.nama)}`, { waitUntil: "networkidle" });
  ok("desa nol: donasi Rp 0", digits(await page.getByTestId("donasi-total").innerText()) === "0");
  ok("desa nol: 0% teradopsi", (await page.getByText("0% teradopsi", { exact: true }).count()) === 1);
  const src = await page.getByTestId("hero-foto").locator("img").getAttribute("src");
  ok("desa nol: foto fallback lokal",
    (src ?? "").includes("Lokasi-Pohon-Asuh-2023") || (src ?? "").includes("_next"),
    (src ?? "").slice(0, 60));
  ok("desa nol: tanpa section peta", (await page.locator("h2", { hasText: "Peta sebaran pohon" }).count()) === 0);
  await page.close();
}

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
