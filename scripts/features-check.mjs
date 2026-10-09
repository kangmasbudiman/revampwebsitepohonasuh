// E2E fitur baru hasil adopsi lindungihutan: statistik dampak beranda,
// /lokasi diperkaya, katalog spesies + karbon, kalkulator karbon, halaman
// legal, lonceng member, testimoni+partner (admin CRUD → section beranda).
// Token JWT diinjeksi langsung (pola admin-check.mjs). Data dev dikembalikan
// ke keadaan semula di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
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
const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

async function ctxWith(browser, payload) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "pa_session", value: await signToken(payload), url: BASE }]);
  return ctx;
}

fs.mkdirSync("screenshots", { recursive: true });
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM testimoni; DELETE FROM partner" 2>/dev/null`);
const browser = await chromium.launch();

// ================= 1. Beranda: statistik dampak + section kondisional =================
const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await anon.newPage();
page.on("dialog", (d) => d.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await page.addInitScript(() => {
  // document.documentElement masih null saat init — tunda sampai DOM siap
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

const [dbPohon, dbAdopted, dbDesa, dbDonatur] = rows(
  "SELECT COUNT(*), SUM(adopted='adopted'), COUNT(DISTINCT desa), (SELECT COUNT(*) FROM member) FROM data_pohon",
)[0].map(Number);
console.log(`   DB: pohon=${dbPohon} diadopsi=${dbAdopted} desa=${dbDesa} donatur=${dbDonatur}`);

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2200); // CountUp animasi 1.5 dtk
const statSection = page.locator("section", { hasText: "Total Pohon Terdata" }).first();
const statText = await statSection.textContent();
assert(statText.includes(String(dbPohon)), `statistik beranda: total pohon ${dbPohon} (statistikdampak)`);
assert(statText.includes(String(dbAdopted)), `statistik beranda: teradopsi ${dbAdopted}`);
assert(statText.includes(String(dbDesa)), `statistik beranda: lokasi ${dbDesa}`);
assert(statText.includes(String(dbDonatur)) && statText.includes("Donatur Terdaftar"), `statistik beranda: donatur ${dbDonatur} (metrik baru)`);
assert(
  (await page.locator("a[href='/kalkulator-karbon']").count()) >= 1,
  "link kalkulator karbon di bawah grid statistik",
);
assert((await page.getByText("Kata Mereka", { exact: true }).count()) === 0, "section testimoni TERSEMBUNYI saat DB kosong");
assert((await page.getByText("Didukung Oleh", { exact: true }).count()) === 0, "section partner TERSEMBUNYI saat DB kosong");
await page.screenshot({ path: "screenshots/110-fitur-home-stats.png", fullPage: false });

// ================= 2. /lokasi diperkaya =================
await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
assert((await page.locator("main div.rounded-2xl .h-2").count()) >= 1, "/lokasi: progress bar adopsi tampil");
assert((await page.getByText("diadopsi").first().isVisible()), "/lokasi: ringkasan 'X diadopsi · Y tersedia'");
const ctaAdopsi = page.locator("a:has-text('Adopsi di sini')").first();
assert(await ctaAdopsi.isVisible(), "/lokasi: tombol 'Adopsi di sini' tampil");
assert(
  (/\/pohon\?lokasi=\w+/.test(await ctaAdopsi.getAttribute("href"))),
  "CTA 'Adopsi di sini' → /pohon?lokasi={slug}",
);
const [desaPertama, slugDiera] = rows("SELECT nama, LOWER(REPLACE(nama,' ','')) FROM desa ORDER BY id LIMIT 1")[0];
await page.goto(`${BASE}/lokasi/${slugDiera}`, { waitUntil: "networkidle" });
for (const label of ["Total pohon terdata", "Pohon diadopsi", "Tersedia untuk adopsi"]) {
  assert((await page.getByText(label).count()) === 1, `/lokasi/${slugDiera}: kartu stat '${label}'`);
}
assert((await page.getByText("Progres adopsi hutan desa").count()) === 1, `/lokasi/${slugDiera}: progress bar adopsi`);
await page.screenshot({ path: "screenshots/113-fitur-lokasi.png", fullPage: false });

// ================= 3. Katalog spesies + karbon =================
const jmlSpecies = Number(rows("SELECT COUNT(*) FROM species_catalog")[0][0]);
const speciesListApi = await (await fetch(`${API}/specieslist`)).json();
const kempasTersediaApi = Number(
  speciesListApi.find((s) => s.nama_latin === "Koompassia malaccensis")?.jml_tersedia ?? -1,
);
assert(kempasTersediaApi >= 0, `API specieslist bawa jml_tersedia (kempas=${kempasTersediaApi})`);
await page.goto(`${BASE}/spesies`, { waitUntil: "networkidle" });
assert(
  (await page.locator("a[href^='/spesies/']").count()) === jmlSpecies,
  `/spesies: ${jmlSpecies} kartu katalog (seed migrasi)`,
);
assert(
  (await page.getByText(`${kempasTersediaApi} Tersedia`, { exact: true }).count()) >= 1,
  `/spesies: chip ketersediaan di kartu katalog (${kempasTersediaApi} Tersedia)`,
);
await page.goto(`${BASE}/spesies?huruf=K`, { waitUntil: "networkidle" });
assert((await page.locator("a[href^='/spesies/']").count()) === 1, "filter huruf K → 1 spesies (Koompassia)");
await page.goto(`${BASE}/spesies?q=kempas`, { waitUntil: "networkidle" });
assert((await page.locator("a[href^='/spesies/']").count()) === 1, "pencarian 'kempas' (nama lokal) → 1 spesies");

const [idKempas] = rows("SELECT id FROM species_catalog WHERE nama_latin='Koompassia malaccensis'")[0];
const kempasKarbon = Number(rows(`SELECT serapan_karbon FROM species_catalog WHERE id=${idKempas}`)[0][0]);
const kempasJml = Number(rows("SELECT COUNT(*) FROM data_pohon WHERE TRIM(species)='Kompassia sumatrana'")[0][0]);
const kempasAvail = Number(
  rows("SELECT COUNT(*) FROM data_pohon WHERE TRIM(species)='Kompassia sumatrana' AND adopted='available'")[0][0],
);
await page.goto(`${BASE}/spesies/${idKempas}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1600); // CountUp serapan karbon
assert((await page.locator("h1", { hasText: "Koompassia malaccensis" }).count()) === 1, "detail spesies: nama latin");
const serapanText = await page.locator("p.text-4xl").first().textContent();
assert(
  serapanText.includes(String(kempasKarbon)) && serapanText.includes("kg CO₂"),
  `detail spesies: serapan karbon ${kempasKarbon} kg CO₂/pohon/tahun (CountUp)`,
);
assert((await page.getByText(`${kempasJml} pohon terdata`).count()) === 1, `detail spesies: ${kempasJml} pohon terdata (match species_key)`);
assert(kempasTersediaApi === kempasAvail, `API specieslist jml_tersedia (${kempasTersediaApi}) = SQL available (${kempasAvail})`);
assert(
  (await page.getByText(`${kempasAvail} Tersedia`, { exact: true }).count()) === 1,
  `detail spesies: chip "${kempasAvail} Tersedia" tampil`,
);
if (kempasJml > 0) {
  const expTersedia = Math.min(12, kempasAvail);
  const expLain = Math.min(4, kempasJml - kempasAvail);
  const nTampil = expTersedia + expLain;
  assert(
    (await page.getByText(`Pohon Koompassia malaccensis (${nTampil})`).count()) === 1,
    `detail spesies: grid ${nTampil} pohon (${expTersedia} tersedia + ${expLain} dipesan/teradopsi)`,
  );
  // Status asli per kartu: badge muncul di semua kartu, tombol keranjang hanya di Tersedia
  const badgeTersedia = await page.getByText("Tersedia", { exact: true }).count();
  const badgeLain = (await page.getByText("Dipesan", { exact: true }).count()) + (await page.getByText("Teradopsi", { exact: true }).count());
  const keranjang = await page.locator("main button[aria-label^='Masukkan']").count();
  assert(
    badgeTersedia === expTersedia && keranjang === expTersedia && badgeLain === expLain,
    `detail spesies: ${badgeTersedia} Tersedia (dgn keranjang) + ${badgeLain} Dipesan/Teradopsi (tanpa keranjang)`,
  );
}
await page.screenshot({ path: "screenshots/111-fitur-spesies-detail.png", fullPage: false });

// ================= 4. Kalkulator karbon =================
const speciesApi = await (await fetch(`${API}/specieslist`)).json();
const denganAngka = speciesApi.filter((s) => Number(s.serapan_karbon) > 0);
const avgSerapan = Math.round(
  denganAngka.reduce((sum, s) => sum + Number(s.serapan_karbon), 0) / denganAngka.length,
);
const input = { mobil: 100, motor: 50, listrik: 250, terbang: 4 };
const ekspektasiTotal = input.mobil * 52 * 0.2 + input.motor * 52 * 0.09 + input.listrik * 12 * 0.87 + input.terbang * 90;
const ekspektasiPohon = Math.ceil(ekspektasiTotal / avgSerapan);
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
console.log(`   kalkulator: total=${ekspektasiTotal} avg=${avgSerapan} pohon=${ekspektasiPohon}`);

await page.goto(`${BASE}/kalkulator-karbon`, { waitUntil: "networkidle" });
for (const [k, v] of Object.entries(input)) await page.fill(`#input-${k}`, String(v));
await page.waitForTimeout(300);
assert(
  (await page.locator("[data-testid='total-emisi']").textContent()) === nf.format(ekspektasiTotal),
  `kalkulator: total emisi ${nf.format(ekspektasiTotal)} kg CO₂e/tahun (id-ID)`,
);
assert(
  (await page.locator("[data-testid='pohon-offset']").textContent()) === `${ekspektasiPohon} pohon`,
  `kalkulator: offset ${ekspektasiPohon} pohon (avg serapan katalog ${avgSerapan})`,
);
assert(
  (await page.locator(`a:has-text('Adopsi ${ekspektasiPohon} pohon sekarang')`).count()) === 1,
  "kalkulator: CTA adopsi memakai jumlah pohon terhitung",
);
assert((await page.getByText("estimasi", { exact: false }).count()) >= 1, "kalkulator: disclaimer estimasi tampil");
await page.screenshot({ path: "screenshots/112-fitur-kalkulator.png", fullPage: false });

// ================= 5. Halaman legal + footer =================
await page.goto(`${BASE}/syarat-ketentuan`, { waitUntil: "networkidle" });
assert((await page.locator("h1", { hasText: "Syarat & Ketentuan" }).count()) === 1, "/syarat-ketentuan: halaman termuat");
const footerLinks = await page.locator("footer a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
assert(footerLinks.includes("/syarat-ketentuan") && footerLinks.includes("/kebijakan-privasi"), "footer: link S&K + Kebijakan Privasi");
assert(footerLinks.includes("/spesies") && footerLinks.includes("/kalkulator-karbon"), "footer: link fitur baru (spesies, kalkulator)");
await page.goto(`${BASE}/kebijakan-privasi`, { waitUntil: "networkidle" });
assert((await page.locator("h1", { hasText: "Kebijakan Privasi" }).count()) === 1, "/kebijakan-privasi: halaman termuat");

// ================= 6. Lonceng notifikasi member (donatur) =================
const donorCtx = await ctxWith(browser, { userId: 2681, name: "Donatur E2E", role: "DONOR" });
const d = await donorCtx.newPage();
d.on("dialog", (dlg) => dlg.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await d.addInitScript(() => {
  // document.documentElement masih null saat init — tunda sampai DOM siap
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});
const unreadAwal = Number(rows("SELECT COUNT(*) FROM pesan_notif WHERE idmember=2681 AND status='noread'")[0][0]);
const [pesanId] = rows(
  `INSERT INTO pesan_notif (idmember,pesan,status,created_at,updated_at) VALUES (2681,'E2E lonceng member ${Date.now()}','noread',NOW(),NOW()); SELECT LAST_INSERT_ID();`,
)[0];
await d.goto(`${BASE}/`, { waitUntil: "networkidle" });
{
  const badge = d.locator("header button[aria-label='Notifikasi'] span").first();
  await badge.waitFor({ timeout: 15000 });
  let txt = "";
  for (let i = 0; i < 20 && txt !== String(unreadAwal + 1); i++) {
    await d.waitForTimeout(500);
    txt = (await badge.count()) ? await badge.textContent() : "";
  }
  assert(Number(txt) === unreadAwal + 1, `lonceng member: badge ${unreadAwal + 1} pesan belum dibaca`);
}
await d.click("header button[aria-label='Notifikasi']");
const itemPesan = d.locator("header button", { hasText: "E2E lonceng member" }).first();
await itemPesan.waitFor({ timeout: 15000 });
await itemPesan.click();
{
  let read = false;
  for (let i = 0; i < 20 && !read; i++) {
    await d.waitForTimeout(500);
    read = rows(`SELECT status FROM pesan_notif WHERE id=${pesanId}`)[0][0] === "read";
  }
  assert(read, "klik notifikasi member → mypesanupdate menandai read di DB");
}
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM pesan_notif WHERE id=${pesanId}" 2>/dev/null`);
assert(true, `pesan uji member dibersihkan (id=${pesanId})`);

// ================= 7. Admin: sidebar 16 + testimoni/partner CRUD + spesies =================
const adminCtx = await ctxWith(browser, { userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 });
const a = await adminCtx.newPage();
a.on("dialog", (dlg) => dlg.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await a.addInitScript(() => {
  // document.documentElement masih null saat init — tunda sampai DOM siap
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

await a.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
const groupBtns = a.locator("aside button[aria-expanded]");
for (let i = 0; i < (await groupBtns.count()); i++) {
  if ((await groupBtns.nth(i).getAttribute("aria-expanded")) === "false") await groupBtns.nth(i).click();
}
const navLinks = await a.locator("aside nav a").allTextContents();
assert(
  navLinks.length === 21 &&
    navLinks.includes("Kelola Spesies") &&
    navLinks.includes("Cerita Dampak") &&
    navLinks.includes("Testimoni & Partner") &&
    navLinks.includes("Backup Database"),
  `sidebar admin 21 menu (termasuk Kelola Spesies, Cerita Dampak, Testimoni & Partner, Backup Database) — ${navLinks.length} link`,
);

// ---- CRUD testimoni: section beranda muncul lalu hilang ----
await a.goto(`${BASE}/admin/testimoni`, { waitUntil: "networkidle" });
const namaTesti = `E2E Testimoni ${Date.now()}`;
await a.click("summary:has-text('Tambah Testimoni')");
await a.fill('input[name="nama"]', namaTesti);
await a.fill('input[name="peran"]', "Donatur sejak 2020");
await a.fill('textarea[name="isi"]', "Pohon saya tumbuh subur, laporan transparan.");
await a.click('form:has(input[name="nama"]) button[type=submit]');
await a.waitForSelector("text=Tersimpan", { timeout: 30000 });
const testiId = Number(rows(`SELECT id FROM testimoni WHERE nama='${namaTesti}'`)[0]?.[0]);
assert(!!testiId, `tambahtestimoni via UI → DB id=${testiId}`);

await page.goto(`${BASE}/`, { waitUntil: "networkidle" }); // halaman publik (konteks anonim)
assert((await page.getByText("Kata Mereka", { exact: true }).count()) >= 1, "beranda: section 'Kata Mereka' MUNCUL setelah isi");
assert((await page.getByText(namaTesti).count()) >= 1, "beranda: isi testimoni admin tampil");

await a.goto(`${BASE}/admin/testimoni`, { waitUntil: "networkidle" });
await a.click(`tr:has-text("${namaTesti}") button:has-text("Hapus")`);
await a.waitForURL("**/admin/testimoni?deleted=1", { timeout: 30000 });
assert(rows(`SELECT COUNT(*) FROM testimoni WHERE id=${testiId}`)[0][0] === "0", "hapustestimoni via UI → row hilang");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
assert((await page.getByText("Kata Mereka", { exact: true }).count()) === 0, "beranda: section testimoni hilang lagi setelah dihapus");

// ---- CRUD partner (tanpa logo) ----
await a.goto(`${BASE}/admin/testimoni`, { waitUntil: "networkidle" });
const namaPartner = `E2E Partner ${Date.now()}`;
await a.click("summary:has-text('Tambah Partner')");
await a.fill('form:has(input[name="url"]) input[name="nama"]', namaPartner);
await a.fill('input[name="url"]', "https://example.com");
await a.click('form:has(input[name="url"]) button[type=submit]');
await a.waitForSelector("text=Tersimpan", { timeout: 30000 });
const partnerId = Number(rows(`SELECT id FROM partner WHERE nama='${namaPartner}'`)[0]?.[0]);
assert(!!partnerId, `tambahpartner via UI → DB id=${partnerId}`);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
assert((await page.getByText("Didukung Oleh", { exact: true }).count()) >= 1, "beranda: section 'Didukung Oleh' muncul");
assert((await page.getByText(namaPartner).count()) >= 1, "beranda: nama partner tampil");
await a.goto(`${BASE}/admin/testimoni`, { waitUntil: "networkidle" });
await a.click(`tr:has-text("${namaPartner}") button:has-text("Hapus")`);
await a.waitForURL("**/admin/testimoni?deleted=1", { timeout: 30000 });
assert(rows(`SELECT COUNT(*) FROM partner WHERE id=${partnerId}`)[0][0] === "0", "hapuspartner via UI → row hilang");
await a.screenshot({ path: "screenshots/114-fitur-admin-testimoni.png", fullPage: true });

// ---- Kelola spesies ----
await a.goto(`${BASE}/admin/spesies`, { waitUntil: "networkidle" });
assert(
  (await a.locator("tbody tr").count()) === jmlSpecies,
  `/admin/spesies: ${jmlSpecies} baris katalog`,
);

await browser.close();
console.log("\n=== SEMUA TAHAP E2E FITUR BARU LULUS ===");
