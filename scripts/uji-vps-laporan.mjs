// Smoke produksi Laporan Kegiatan form step-by-step (pohonasuh.io): petugas
// (login asli) buat DRAF + foto bertahap → kirim (dana/hasil) → DRAF kedua →
// admin (JWT AUTH_SECRET VPS) melihat terkirim + draf → SETUJUI via tombol
// cepat → kartu mobile → hapus semua + bersihkan.
// Jalankan: node scripts/uji-vps-laporan.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const HARI = new Date().toISOString().slice(0, 10);
const JUDUL = `UJI VPS Laporan ${Date.now()}`;

const assert = (c, m) => {
  if (!c) { console.error("✗ GAGAL:", m); process.exit(1); }
  console.log("PASS —", m);
};
const vps = (sql) =>
  execSync(`ssh pohonasuh-vps "docker exec pohonasuh-mysql mysql -uroot -p'Pohonassuh2026#' pohonasuh -N -e \\"${sql.replace(/"/g, '\\\\"')}\\" 2>/dev/null"`).toString().trim();
const vpsShell = (cmd) =>
  execSync(`ssh pohonasuh-vps "${cmd}"`).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForDb(fn, timeout = 20000, label = "DB") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (fn()) return true; } catch {}
    await sleep(400);
  }
  throw new Error(`waitForDb timeout: ${label}`);
}

// bersihkan sisa run gagal sebelum mulai — file fisik HANYA milik fixture kita,
// nama file diambil dari DB (glob bebas `laporan_*.png` pernah menghapus foto
// produksi user — JANGAN kembali ke pola glob).
const DIR_LAPORAN = "/var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/laporan";
vps(`SELECT lf.url FROM laporan_foto lf JOIN laporan_kegiatan lk ON lk.id=lf.idlaporan WHERE lk.judul LIKE 'UJI VPS Laporan%'`)
  .split("\n").filter(Boolean).forEach((u) => {
    const nama = u.trim().split("/").pop();
    if (nama) vpsShell(`rm -f ${DIR_LAPORAN}/${nama}`);
  });
vps(`DELETE lf FROM laporan_foto lf JOIN laporan_kegiatan lk ON lk.id=lf.idlaporan WHERE lk.judul LIKE 'UJI VPS Laporan%'`);
vps(`DELETE FROM laporan_kegiatan WHERE judul LIKE 'UJI VPS Laporan%'`);

const browser = await chromium.launch();

// ================= SISI PETUGAS (login asli) =================
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`${BASE}/masuk`);
await p.fill("#email", "petugastes2026@yahoo.com");
await p.fill("#password", "Petugas1234");
await p.click("button[type=submit]");
await p.waitForURL(/\/admin/, { timeout: 30000 });
assert(true, `login petugas → ${p.url()}`);

// halaman buat baru (form step ala contoh)
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
const nav = await p.locator("aside nav a").allTextContents();
assert(
  nav.length === 3 && nav.includes("Laporan Kegiatan"),
  `sidebar petugas 3 menu (${nav})`,
);
await p.click('a:has-text("Tambah Laporan")');
await p.waitForURL(/\/admin\/laporan\/baru/, { timeout: 30000 });
assert((await p.locator("ol > li").count()) === 10, "form 10 langkah bernomor tampil");

// buat DRAF + 1 foto bertahap
await p.fill('form input[name="judul"]', JUDUL);
await p.selectOption('form select[name="jenis"]', "pemantauan");
await p.fill('form input[name="tanggal"]', HARI);
await p.click('[data-testid="tambah-hari"]');
await p.fill('[data-testid="entri-teks-0"]', "Smoke test laporan kegiatan produksi.");
await p.setInputFiles('form input[type=file][accept^="image"]', {
  name: "uji-laporan.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
});
await p.click('button:has-text("Simpan sebagai Draft")');
await p.waitForURL(/\/admin\/laporan\/\d+\/edit\?created=1/, { timeout: 30000 });
const ID = Number(p.url().match(/\/admin\/laporan\/(\d+)\/edit/)[1]);
assert(!!ID, `draf dibuat id=${ID}`);
await waitForDb(() => vps(`SELECT status FROM laporan_kegiatan WHERE id=${ID}`) === "draft", 20000, "status draft");
await waitForDb(() => vps(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`) === "1", 20000, "foto draf");
assert(true, "draf + 1 foto tersimpan (DB)");
const fotoRow = vps(`SELECT url FROM laporan_foto WHERE idlaporan=${ID} LIMIT 1`).split("\t");
const http = await fetch(fotoRow[0]);
assert(http.status === 200 && (http.headers.get("content-type") ?? "").includes("image/"), `file tersaji via URL rest.pohonasuh.io (${http.status})`);

// lengkapi lalu KIRIM
await p.fill('form input[name="dana"]', "350000");
await p.fill('form textarea[name="hasil"]', "Hasil uji produksi.");
await p.click('button:has-text("Kirim Laporan")');
await p.waitForURL(/dikirim=1/, { timeout: 30000 });
await waitForDb(() => {
  const r = vps(`SELECT status,dana FROM laporan_kegiatan WHERE id=${ID}`).split("\t");
  return r[0] === "terkirim" && Number(r[1]) === 350000;
}, 20000, "terkirim+dana");
assert(true, "kirim: status=terkirim dana=350000");

// draf kedua (tetap draf) — utk uji visibilitas admin & tombol setujui
const JUDUL_DRAF = `UJI VPS Laporan Draf ${Date.now()}`;
await p.goto(`${BASE}/admin/laporan/baru`, { waitUntil: "networkidle" });
await p.fill('form input[name="judul"]', JUDUL_DRAF);
await p.click('button:has-text("Simpan sebagai Draft")');
await p.waitForURL(/\/admin\/laporan\/\d+\/edit\?created=1/, { timeout: 30000 });
const ID_DRAF = Number(p.url().match(/\/admin\/laporan\/(\d+)\/edit/)[1]);
assert(!!ID_DRAF, `draf kedua dibuat id=${ID_DRAF} (tanpa foto/dana)`);
await waitForDb(() => vps(`SELECT status FROM laporan_kegiatan WHERE id=${ID_DRAF}`) === "draft", 20000, "draf kedua draft");

// daftar: desktop tabel + chip; lalu mobile kartu
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(await p.locator("table").first().isVisible(), "desktop: tabel tampil");
assert((await p.locator("a", { hasText: JUDUL }).count()) >= 1, "baris laporan tampil");
assert((await p.locator("table span", { hasText: "Terkirim" }).count()) >= 1, "chip Terkirim tampil");
assert((await p.locator('button:has-text("Setujui")').count()) === 0, "petugas: TANPA tombol Setujui di daftar");

// popup galeri semua foto (desktop)
await p.click(`button[aria-label="Lihat 1 foto ${JUDUL}"]`);
await p.waitForSelector('[data-testid="popup-foto-laporan"]');
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "1 / 1",
  "popup galeri terbuka dari tabel (1 / 1)",
);
assert((await p.locator('button[aria-label="Foto berikutnya"]').count()) === 0, "popup 1 foto: tanpa tombol navigasi");
await p.keyboard.press("Escape");
await p.waitForSelector('[data-testid="popup-foto-laporan"]', { state: "detached" });
assert(true, "Escape menutup popup galeri");

await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(!(await p.locator("table").first().isVisible()), "mobile 390px: tabel tersembunyi");
assert(await p.locator("div.rounded-2xl.p-4", { hasText: JUDUL }).first().isVisible(), "mobile 390px: kartu laporan tampil");

// popup galeri via strip foto kartu mobile
await p.click(`button[aria-label="Lihat foto 1 ${JUDUL}"]`);
await p.waitForSelector('[data-testid="popup-foto-laporan"]');
assert(
  (await p.locator('[data-testid="popup-foto-counter"]').textContent()).trim() === "1 / 1",
  "mobile: popup galeri terbuka dari strip kartu (1 / 1)",
);
await p.click('button[aria-label="Tutup galeri foto"]');
await p.waitForSelector('[data-testid="popup-foto-laporan"]', { state: "detached" });
assert(true, "mobile: tombol X menutup popup galeri");

// ================= SISI ADMIN (JWT AUTH_SECRET VPS) =================
const secretB64 = vpsShell("grep -o 'AUTH_SECRET=.*' /var/www/apps/pohonasuh/frontend/.env.production")
  .replace("AUTH_SECRET=", "").replace(/^\"|\"$/g, "");
const secret = new TextEncoder().encode(secretB64);
const tok = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30m").sign(secret);
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctxA.addCookies([{ name: "pa_session", value: tok, url: BASE }]);
const a = await ctxA.newPage();
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert(
  (await a.locator("main", { hasText: JUDUL }).count()) >= 1,
  "admin melihat laporan terkirim buatan petugas",
);
assert(
  (await a.locator("main", { hasText: JUDUL_DRAF }).count()) >= 1,
  "admin melihat draf petugas (belum dikirim)",
);
assert((await a.locator('select[aria-label="Filter petugas"]').count()) === 1, "admin punya filter petugas");
assert(
  (await a.locator(`table form:has(input[name="id"][value="${ID_DRAF}"]) button:has-text("Setujui")`).count()) === 1,
  "admin: tombol Setujui muncul juga di baris draf",
);

// draf belum lengkap: tombol tampil utk admin tapi backend menolak (isi kosong)
await a.evaluate(() => {
  new MutationObserver(() => {
    document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
      if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
await a.click(`table form:has(input[name="id"][value="${ID_DRAF}"]) button:has-text("Setujui")`);
await a.waitForURL(/error=/, { timeout: 30000 });
assert(
  (await a.locator("body").innerText()).includes("belum lengkap"),
  "setujui draf belum lengkap → ditolak dengan pesan ramah",
);
assert(
  vps(`SELECT status FROM laporan_kegiatan WHERE id=${ID_DRAF}`) === "draft",
  "status draf tetap draft setelah ditolak",
);

// setujui laporan TERKIRIM petugas via tombol cepat — pasang ulang observer (navigasi baru)
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
await a.evaluate(() => {
  new MutationObserver(() => {
    document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
      if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
await a.click(`table form:has(input[name="id"][value="${ID}"]) button:has-text("Setujui")`);
await a.waitForURL(/disetujui=1/, { timeout: 30000 });
await waitForDb(() => vps(`SELECT status FROM laporan_kegiatan WHERE id=${ID}`) === "disetujui", 20000, "approve prod");
assert(true, "admin menyetujui via tombol cepat → status=disetujui");
await a.goto(`${BASE}/admin/laporan`, { waitUntil: "networkidle" });
assert((await a.locator("table span", { hasText: "Disetujui" }).count()) >= 1, "chip Disetujui tampil (admin)");

// ================= CLEANUP: hapus via UI petugas =================
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(`${BASE}/admin/laporan/${ID}/edit`, { waitUntil: "networkidle" });
// auto-klik tombol konfirmasi modal saat muncul (pola admin-check)
await p.evaluate(() => {
  new MutationObserver(() => {
    document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
      if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
await p.click('form:has(input[name="id"]) button:has-text("Hapus Laporan")');
await p.waitForURL(/\/admin\/laporan\?deleted=1/, { timeout: 30000 });
assert(vps(`SELECT COUNT(*) FROM laporan_kegiatan WHERE id=${ID}`) === "0", "laporan terhapus dari DB");
assert(vps(`SELECT COUNT(*) FROM laporan_foto WHERE idlaporan=${ID}`) === "0", "foto ikut terhapus");
const namaFile = fotoRow[0].split("/").pop();
vpsShell(`rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/laporan/${namaFile}`);

// hapus draf kedua via UI petugas (pasang ulang auto-confirm — page sudah navigasi)
await p.goto(`${BASE}/admin/laporan/${ID_DRAF}/edit`, { waitUntil: "networkidle" });
await p.evaluate(() => {
  new MutationObserver(() => {
    document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
      if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
await p.click('form:has(input[name="id"]) button:has-text("Hapus Laporan")');
await p.waitForURL(/\/admin\/laporan\?deleted=1/, { timeout: 30000 });
assert(vps(`SELECT COUNT(*) FROM laporan_kegiatan WHERE id=${ID_DRAF}`) === "0", "draf kedua terhapus dari DB");
assert(vps("SELECT COUNT(*) FROM laporan_kegiatan WHERE judul LIKE 'UJI VPS Laporan%'") === "0", "cleanup: 0 laporan uji tersisa");

// logout petugas (simpan cookie QA tetap bersih)
await p.locator("aside form button:has-text('Keluar')").click();
await p.waitForURL(`${BASE}/`, { timeout: 30000 });

await browser.close();
console.log("\n=== SMOKE LAPORAN KEGIATAN (FORM CONTOH) PRODUKSI LULUS ===");
