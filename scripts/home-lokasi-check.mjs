// Probe section "Lokasi Hutan" beranda versi slider: 4 kartu ber-foto
// terlihat di desktop, sisanya digeser (manual + otomatis), jumlah kartu =
// desa aktif di DB, klik kartu → halaman detail lokasi.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

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

// Desa aktif + jumlah pohonnya dari DB dev (fixture dinamis, pola memo-check).
const desaAktif = rows(
  "SELECT d.nama, COUNT(p.id) FROM desa d LEFT JOIN data_pohon p ON p.desa=d.nama WHERE d.aktif=1 GROUP BY d.nama ORDER BY d.nama",
);
assert(desaAktif.length >= 5, `prasyarat: ada ${desaAktif.length} desa aktif (≥5 agar slider berguna)`);

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

const section = page.locator("[data-testid='section-lokasi']");
assert(await section.count() === 1, "section lokasi slider tampil di beranda");
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

assert(
  (await section.locator("[data-testid='jml-lokasi']").textContent()) === String(desaAktif.length),
  `pill jumlah lokasi = ${desaAktif.length} desa aktif (DB)`,
);

const kartu = section.locator("a[href^='/lokasi/']");
const nKartu = await kartu.count();
assert(nKartu === desaAktif.length, `${nKartu} kartu lokasi = semua desa aktif`);

// Setiap kartu punya foto hero (img next/image) — termasuk fallback bawaan.
const nFoto = await section.locator("a[href^='/lokasi/'] img").count();
assert(nFoto === nKartu, `semua ${nKartu} kartu ber-foto hero`);

// Desktop 1440: track di dalam kontainer max-w-6xl (sejajar konten lain),
// TEPAT 4 kartu terlihat — kartu ke-5 sama sekali tidak mengintip.
const bbox = await kartu.nth(0).boundingBox();
assert(bbox.x > 100, `kartu pertama sejajar konten halaman (x=${Math.round(bbox.x)}, bukan nempel tepi layar)`);
const terlihat = [];
for (let i = 0; i < nKartu; i++) {
  const b = await kartu.nth(i).boundingBox();
  if (b.x >= 0 && b.x + b.width <= 1440) terlihat.push(i);
}
assert(terlihat.length === 4, `tepat 4 kartu terlihat penuh di 1440px (${terlihat.length})`);
// Kartu ke-5 terpotong oleh scrollport track (boundingBox tetap memberi
// posisi layout meski visual tersembunyi) — batasnya track, bukan viewport.
const trackBox = await section.locator("div.overflow-x-auto").boundingBox();
const trackKanan = trackBox.x + trackBox.width;
const kelima = await kartu.nth(4).boundingBox();
assert(kelima.x >= trackKanan - 1, `kartu ke-5 tersembunyi penuh di luar track (x=${Math.round(kelima.x)} ≥ batas ${Math.round(trackKanan)}) — lokasi lain via slide`);

// Info adopsi + progress bar per kartu
const kartuPertama = kartu.nth(0);
const teks = await kartuPertama.textContent();
assert(/diadopsi/.test(teks) && /teradopsi/.test(teks), "kartu menampilkan 'X diadopsi · Y tersedia' + persen");
assert((await kartuPertama.locator(".h-2").count()) === 1, "kartu punya progress bar adopsi");

// Geser manual: tombol panah menggeser PER SATU KARTU (≈270-280px)
const track = section.locator("div.overflow-x-auto");
const sebelum = await track.evaluate((el) => el.scrollLeft);
await section.getByRole("button", { name: "Slide berikutnya" }).click();
await page.waitForTimeout(900);
const sesudah = await track.evaluate((el) => el.scrollLeft);
const delta = sesudah - sebelum;
assert(delta > 200 && delta < 400, `tombol panah menggeser satu kartu (${Math.round(sebelum)} → ${Math.round(sesudah)}, Δ${Math.round(delta)})`);
const kelimaSetelah = await kartu.nth(4).boundingBox();
assert(
  kelimaSetelah.x >= trackBox.x - 1 && kelimaSetelah.x + kelimaSetelah.width <= trackKanan + 1,
  `setelah geser, kartu ke-5 masuk jendela track menggantikan kartu pertama (x=${Math.round(kelimaSetelah.x)})`,
);

// Auto-advance 4 dtk — klik panah tadi memicu jeda 10 dtk (pausedUntil),
// jadi tunggu masa jeda itu lewat + pointer keluar section.
await page.mouse.move(5, 5);
await page.waitForTimeout(10500);
const sebelumAuto = await track.evaluate((el) => el.scrollLeft);
await page.waitForTimeout(6000);
const sesudahAuto = await track.evaluate((el) => el.scrollLeft);
assert(Math.abs(sesudahAuto - sebelumAuto) > 50, `auto-advance bergeser sendiri (${Math.round(sebelumAuto)} → ${Math.round(sesudahAuto)})`);

// Nama desa Title Case + klik kartu → detail lokasi
const nama = await kartuPertama.locator("h3").textContent();
assert(/^[A-Z]/.test(nama.trim()), `nama desa Title Case di kartu ("${nama}")`);
await kartuPertama.click();
await page.waitForURL(/\/lokasi\/\w+/);
assert(true, `klik kartu → ${page.url()}`);
await page.goBack();

// Mobile 390: kartu pertama 85% lebar, kartu kedua sebagian terlihat
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
const mSection = m.locator("[data-testid='section-lokasi']");
await mSection.scrollIntoViewIfNeeded();
const b1 = await mSection.locator("a[href^='/lokasi/']").nth(0).boundingBox();
const b2 = await mSection.locator("a[href^='/lokasi/']").nth(1).boundingBox();
assert(b1.width > 330 && b1.width < 370, `mobile: satu kartu penuh dalam konten (${Math.round(b1.width)}px)`);
assert(b2.x >= 390, `mobile: kartu kedua tidak mengintip (x=${Math.round(b2.x)})`);
await mSection.screenshot({ path: "screenshots/120-beranda-lokasi-mobile.png" });

await section.scrollIntoViewIfNeeded();
await section.screenshot({ path: "screenshots/121-beranda-lokasi-desktop.png" });

await browser.close();
console.log("\nSELESAI — slider lokasi beranda OK");
