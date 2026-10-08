// Smoke test PRODUKSI (pohonasuh.io) untuk 2 fitur 2026-10-08:
//   A. Sinkronisasi tagging-print: kartu order yang sudah punya foto tagging
//      menampilkan chip "Sudah ditagging" (bukan checkbox papan)
//   B. Cerita Dampak: CRUD admin + halaman publik + nav
// Login via form (pola uji-vps-tambah-foto); fixture dibersihkan di akhir.
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const ok = (c, m) => {
  if (!c) {
    console.error("✗ GAGAL:", m);
    process.exitCode = 1;
    return false;
  }
  console.log("✓", m);
  return true;
};

const PW = execSync(
  `ssh pohonasuh-vps "grep '^MYSQL_ROOT_PASSWORD=' /var/www/apps/pohonasuh/.env | cut -d= -f2"`,
).toString().trim();
const rows = (q) =>
  execSync(
    `ssh pohonasuh-vps "docker exec pohonasuh-mysql mysql -uroot -p'${PW}' pohonasuh -N -B -e \\"${q.replace(/"/g, '\\\\"')}\\"" 2>/dev/null`,
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
const one = (q) => rows(q)[0]?.[0] ?? "";

// ============== Fixture cleanup awal ==============
for (const f of rows(`SELECT foto FROM cerita WHERE judul LIKE 'Cerita UJI VPS%' AND foto IS NOT NULL`).map((r) => r[0])) {
  execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/assets/${f}"`);
}
rows(`DELETE FROM cerita WHERE judul LIKE 'Cerita UJI VPS%'`);
execSync(`sips -s format jpeg -Z 500 public/images/Lokasi-Pohon-Asuh-2023.jpg --out /tmp/cerita-vps.jpg >/dev/null 2>&1`);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

// ============== B1: admin tambah cerita (dengan foto) ==============
await page.goto(`${BASE}/masuk?next=%2Fadmin%2Fcerita`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click("button[type=submit]");
await page.waitForURL("**/admin/cerita", { timeout: 30000 });
ok(true, "login admin produksi → /admin/cerita");
ok((await page.locator('aside nav a[href="/admin/cerita"]').count()) === 1, "sidebar memuat menu Cerita Dampak");

const JUDUL = "Cerita UJI VPS Dampak";
await page.getByText("＋ Tambah Cerita").click();
await page.locator('input[name="judul"]').fill(JUDUL);
await page.locator('input[name="narasumber"]').fill("Bu Cerita Uji");
await page.locator('input[name="lokasi"]').fill("Rantau Kermas");
await page.locator('textarea[name="isi"]').fill("Kisah uji produksi cerita dampak end-to-end.");
await page.setInputFiles('input[name="foto"]', "/tmp/cerita-vps.jpg");
await page.getByRole("button", { name: "Tambah Cerita" }).click();
await page.getByText("Cerita tersimpan.").waitFor({ timeout: 30000 });
const ID = one(`SELECT id FROM cerita WHERE judul='${JUDUL}'`);
const FOTO = one(`SELECT IFNULL(foto,'') FROM cerita WHERE id=${ID}`);
ok(!!ID && FOTO.startsWith("cover_"), `cerita terbuat di prod (id ${ID}, foto ${FOTO})`);

// ============== B2: halaman publik + detail + nav ==============
await page.goto(`${BASE}/cerita-dampak`, { waitUntil: "networkidle" });
const kartu = page.locator(`a[href="/cerita-dampak/${ID}"]`);
await kartu.waitFor({ timeout: 15000 });
ok((await kartu.innerText()).includes("Bu Cerita Uji"), "kartu cerita tampil di publik");
ok((await kartu.locator("img").count()) === 1, "foto termuat di kartu publik (assets prod)");
ok((await page.locator('header a[href="/cerita-dampak"]').count()) >= 1, "nav Informasi memuat link");
await kartu.click();
await page.waitForURL(`**/cerita-dampak/${ID}`);
ok(await page.getByRole("heading", { name: JUDUL, exact: true }).isVisible().catch(() => false), "detail cerita publik termuat");

// ============== B3: hapus cerita ==============
await page.goto(`${BASE}/admin/cerita`, { waitUntil: "networkidle" });
const baris = page.locator("main table tbody tr", { hasText: JUDUL }).first();
await baris.getByRole("button", { name: "Hapus" }).click();
await page.getByRole("dialog").getByRole("button", { name: "Ya, Lanjutkan" }).click();
await page.waitForURL("**/admin/cerita?deleted=1", { timeout: 30000 });
ok(one(`SELECT COUNT(*) FROM cerita WHERE id=${ID}`) === "0", "cerita terhapus dari DB prod");

// ============== A: chip sudah-ditagging di /admin/tagging ==============
// Order di desa tugas petugas 2683 yang sudah ditagging (ber-foto / selesai).
const adaOrder = one(
  `SELECT COUNT(*) FROM data_adopsi a JOIN desa_petugas dp ON dp.idpetugas=2683 JOIN desa d ON d.id=dp.iddesa AND d.nama=a.desa WHERE a.proses=3 OR (SELECT COUNT(*) FROM foto_tagging f WHERE f.idadopsi=a.id)>0`,
);
if (adaOrder === "0") {
  console.log("ℹ order ber-foto petugas tidak ada — skip tes chip (buat order+upload dulu bila perlu)");
} else {
  await page.goto(`${BASE}/masuk?next=%2Fadmin%2Ftagging`, { waitUntil: "networkidle" });
  // masih login admin → logout dulu via /masuk? tidak: login form menolak sesi ada? gunakan context baru
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/masuk?next=%2Fadmin%2Ftagging`, { waitUntil: "networkidle" });
  await p2.fill('input[name="email"]', "petugastes2026@yahoo.com");
  await p2.fill('input[name="password"]', "Petugas1234");
  await p2.click("button[type=submit]");
  await p2.waitForURL("**/admin/tagging", { timeout: 30000 });
  ok(true, "login petugas produksi → /admin/tagging");
  await p2.getByTestId("chip-sudah-tagging").first().waitFor({ timeout: 20000 });
  const chip = await p2.getByTestId("chip-sudah-tagging").first().innerText();
  ok(/Sudah ditagging/.test(chip), `chip "${chip}" tampil di kartu ber-foto (bukan checkbox papan)`);
  await ctx2.close();
}

// ============== Cleanup ==============
if (FOTO) execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/assets/${FOTO}"`);
rows(`DELETE FROM cerita WHERE judul LIKE 'Cerita UJI VPS%'`);
await browser.close();
console.log("\n=== SMOOKE PRODUKSI CERITA DAMPAK + SINKRONISASI TAGGING SELESAI ===");
