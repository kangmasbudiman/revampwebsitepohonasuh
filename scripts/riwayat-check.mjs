// E2E riwayat adopsi di halaman detail pohon (/pohon/[code]): stepper durasi
// di panel detail + section "Riwayat Adopsi Pohon" (nama pengasuh, masa
// adopsi mulai–selesai, badge Berjalan/Selesai) — paritas vs SQL & API.
// Pohon uji dipilih DINAMIS dari DB (punya riwayat / tanpa riwayat).
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/riwayat-check.mjs
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

// ===== Fixture baca-saja: pohon DENGAN riwayat terbanyak + yang TANPA riwayat =====
// TANPA join data_pohon — idpohon tidak unik (duplikat fisik E065 dsb.)
// sehingga join membetulkan COUNT (fan-out 2×).
const [RIW_KODE, RIW_JML] = rows(
  `SELECT idpohon, COUNT(*) FROM data_adopsi GROUP BY idpohon ORDER BY COUNT(*) DESC LIMIT 1`,
)[0];
const KOSONG = rows(
  `SELECT p.idpohon FROM data_pohon p
   WHERE p.adopted='available' AND NOT EXISTS (SELECT 1 FROM data_adopsi a WHERE a.idpohon = p.idpohon)
   LIMIT 1`,
)[0][0];
if (!RIW_KODE || !KOSONG) throw new Error("butuh pohon ber-riwayat + pohon tanpa riwayat");
const hargaR = Number(rows(`SELECT harga FROM data_pohon WHERE idpohon='${RIW_KODE}' LIMIT 1`)[0][0]);
console.log(`Pohon uji: riwayat=${RIW_KODE} (${RIW_JML} baris), kosong=${KOSONG}`);

// Ekpektasi SQL: baris terbaru + status aktif. Tanggal diformat via Intl
// id-ID di sini (sama dgn halaman) — jangan pakai DATE_FORMAT MySQL
// (singkatan bulannya Inggris: "May" vs "Mei").
const terbaru = rows(
  `SELECT COALESCE(NULLIF(TRIM(m.name), ''), NULLIF(TRIM(a.nama), ''), '-'),
          DATE_FORMAT(a.tgl_adopt, '%Y-%m-%d'),
          COALESCE(a.tgl_exp, DATE_ADD(a.tgl_adopt, INTERVAL a.dur YEAR))
   FROM data_adopsi a LEFT JOIN member m ON m.id = a.pengasuh
   WHERE a.idpohon = '${RIW_KODE}'
   ORDER BY a.tgl_adopt DESC, a.id DESC LIMIT 1`,
)[0];
const fmtId = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const tglUi = fmtId.format(new Date(`${terbaru[1]}T00:00:00`));
const selesaiTerbaru = terbaru[2] >= new Date().toISOString().slice(0, 10);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ===== 1. API riwayatpohon: jumlah & urutan =====
const apiRes = await fetch(`${API}/riwayatpohon`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `idpohon=${RIW_KODE}`,
}).then((r) => r.json());
ok("API balas array", Array.isArray(apiRes));
ok(`API jumlah baris = SQL (${RIW_JML})`, Array.isArray(apiRes) && String(apiRes.length) === String(RIW_JML));

// ===== 2. Halaman detail pohon ber-riwayat =====
await page.goto(`${BASE}/pohon/${RIW_KODE}`, { waitUntil: "networkidle" });

// ===== 3. Section riwayat: jumlah item, nama terbaru, periode, badge =====
const items = page.locator('[data-testid="riwayat-item"]');
await items.first().waitFor({ timeout: 10000 });
ok(
  `jumlah kartu riwayat = SQL (${RIW_JML})`,
  (await items.count()) === Number(RIW_JML),
  `${await items.count()} vs ${RIW_JML}`,
);
const first = await items.first().textContent();
ok("kartu pertama = baris TERBARU (nama pengasuh SQL)", first.includes(terbaru[0]), terbaru[0]);
ok("kartu pertama memuat tanggal mulai", first.includes(tglUi), tglUi);
ok(
  "badge status baris terbaru sesuai tgl_exp",
  first.includes(selesaiTerbaru ? "Berjalan" : "Selesai"),
  selesaiTerbaru ? "Berjalan" : "Selesai",
);
ok("judul section tampil", (await page.locator("h2#riwayat-adopsi").count()) === 1);

// ===== 4. Pohon available tanpa riwayat: section tersembunyi + stepper ada =====
await page.goto(`${BASE}/pohon/${KOSONG}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
ok(
  `pohon tanpa riwayat (${KOSONG}): section tersembunyi`,
  (await page.locator('[data-testid="riwayat-item"]').count()) === 0 &&
    (await page.locator("h2#riwayat-adopsi").count()) === 0,
);
// Pohon available pasti ber-panel adopsi (pohon ber-riwayat bisa sudah adopted).
const inDur = page.locator('input[aria-label="Durasi adopsi"]');
ok("detail available: stepper durasi tampil", (await inDur.count()) === 1);
ok("detail available: nilai awal 1 tahun", (await inDur.inputValue()) === "1");

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
