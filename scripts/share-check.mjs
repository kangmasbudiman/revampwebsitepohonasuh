// E2E fitur "Bagikan Aksi Saya" (/bagikan/<certnum>): design story 1080×1920,
// guest tanpa kontrol; pemilik: pilih template desa (?tpl=) + pilih pohon
// (?pohon=), memo reuse sertifikat, unduh PNG (IHDR 1080×1920); admin CRUD
// template share + scoping petugas via ?idpetugas=. Fixture DINAMIS dari DB
// (certnum multi-pohon) — dibersihkan by id + rm file upload nama spesifik.
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/share-check.mjs
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

let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

// ===== Fixture: certnum multi-pohon terbaru (≥2 pohon, 1 pengasuh) =====
const [CERT, DESA, PEMILIK] = rows(
  `SELECT certnum, MIN(desa), MIN(pengasuh) FROM data_adopsi WHERE certnum<>'' AND certnum IS NOT NULL
   GROUP BY certnum HAVING COUNT(*)>1 ORDER BY MAX(id) DESC LIMIT 1`,
)[0];
if (!CERT) throw new Error("butuh certnum multi-pohon fixture");
if (rows("SELECT COUNT(*) FROM template_share")[0][0] !== "0") {
  throw new Error("tabel template_share harus kosong saat mulai (bersihkan sisa tes)");
}
const publik = await (await fetch(`${API}/sertifikatpublik/${encodeURIComponent(CERT)}`)).json();
const POHON = publik.pohon_list ?? [];
console.log(`Fixture: certnum=${CERT} desa=${DESA} pemilik=${PEMILIK} pohon=${POHON.length}`);

// Asset lokal yang sudah ada di public/assets (fixture INSERT, BUKAN upload).
// A: template putih polos 900×1600 dibuat dinamis (canvas → JPEG) supaya
//    asersi piksel isi PNG deterministik; B: foto lokal.
const ASSET_A = `e2e_tpl_putih_${Date.now()}.jpg`;
const ASSET_B = "1676465306902.jpg";
const shareUrl = `${BASE}/bagikan/${CERT}`;

const browser = await chromium.launch();
{
  const b64 = await (await browser.newPage()).evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 1600;
    const x = c.getContext("2d");
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 900, 1600);
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  fs.writeFileSync(`/opt/homebrew/var/www/restApiPohonasuh/public/assets/${ASSET_A}`, Buffer.from(b64, "base64"));
}

// ===== 1. Guest: design + fallback gradient, tanpa kontrol =====
const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await guest.goto(shareUrl, { waitUntil: "networkidle" });
ok("guest: halaman termuat + design tampil", (await guest.locator("[data-testid='share-design']").count()) === 1);
ok("guest: tanpa template → latar gradient (tanpa <img> bg)", (await guest.locator("[data-testid='share-design'] img").count()) === 0);
ok(
  "guest: kontrol pemilik TIDAK tampil (chip/tile/unduh)",
  (await guest.locator("[data-testid='chip-pohon']").count()) === 0 &&
    (await guest.locator("[data-testid='tile-template']").count()) === 0 &&
    (await guest.locator("[data-testid='unduh-share']").count()) === 0,
);
ok("guest: hint pengadopsi tampil", (await guest.locator("main").textContent()).includes("pengadopsi"));
await guest.close();

// ===== 2. INSERT 2 template desa ini (A utama, B cadangan) =====
const tNama = `E2E Share ${Date.now()}`;
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "
   INSERT INTO template_share (desa,nama,subtext,file,aktif,utama,created_at,updated_at) VALUES ('${DESA}','${tNama} A','Hutan Uji E2E','${ASSET_A}',1,1,NOW(),NOW());
   SET @a = LAST_INSERT_ID();
   INSERT INTO template_share (desa,nama,subtext,file,aktif,utama,created_at,updated_at) VALUES ('${DESA}','${tNama} B','','${ASSET_B}',1,0,NOW(),NOW());
   SELECT @a; SELECT LAST_INSERT_ID();" 2>/dev/null`,
);
const ID_A = Number(rows(`SELECT id FROM template_share WHERE nama='${tNama} A'`)[0][0]);
const ID_B = Number(rows(`SELECT id FROM template_share WHERE nama='${tNama} B'`)[0][0]);
ok("fixture: 2 template_share di-insert", !!ID_A && !!ID_B, `id=${ID_A},${ID_B}`);

// ===== 3. Pemilik: kontrol + template utama default + ganti ?tpl= =====
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
ctx.addCookies([{ name: "pa_session", value: await signToken({ userId: Number(PEMILIK), name: "Pemilik QA", role: "USER" }), url: BASE }]);
const page = await ctx.newPage();
await page.goto(shareUrl, { waitUntil: "networkidle" });
ok("pemilik: 2 tile template tampil", (await page.locator("[data-testid='tile-template'] button").count()) === 2);
ok("pemilik: chip pohon sesuai pohon_list", (await page.locator("[data-testid='chip-pohon'] button").count()) === POHON.length, `${POHON.length} pohon`);
ok("pemilik: form memo reuse tampil", (await page.locator('textarea[name="memo"]').count()) === 1);

const bgImg = page.locator("[data-testid='share-design'] img").first();
await bgImg.waitFor({ timeout: 10000 });
ok("template utama (A) jadi latar default", (await bgImg.getAttribute("src")).includes(ASSET_A));

// Format hadiah: donor (nama_pengasuh) + penerima (nama) + subtext template.
const DONOR = String(publik.nama_pengasuh ?? "").trim();
const PENERIMA = String(publik.nama ?? "").trim();
const teksDesign = await page.locator("[data-testid='share-design']").textContent();
if (DONOR && PENERIMA && DONOR.toLowerCase() !== PENERIMA.toLowerCase()) {
  ok("format hadiah: nama donatur tampil", teksDesign.includes(DONOR), DONOR);
  ok("format hadiah: nama penerima tampil", teksDesign.includes(PENERIMA), PENERIMA);
  ok("format hadiah: kalimat 'Menghadiahkan pohon'", teksDesign.includes("Menghadiahkan pohon"));
} else {
  ok("format mandiri: nama pengadopsi tampil", teksDesign.includes(PENERIMA || DONOR));
}
ok("subtext template tampil di kartu lokasi", teksDesign.includes("Hutan Uji E2E"));

// Ganti template via tile → ?tpl= + img src berganti
await page.locator(`[data-testid='tile-template'] button:has-text("${tNama} B")`).click();
await page.waitForURL(new RegExp(`tpl=${ID_B}`), { timeout: 15000 });
await page.waitForFunction(
  (f) => !!document.querySelector("[data-testid='share-design'] img")?.getAttribute("src")?.includes(f),
  ASSET_B,
  { timeout: 15000 },
);
ok("klik tile B → ?tpl= & latar berganti ke file B", true);

// ===== 4. Ganti pohon via chip → info pohon di design berubah =====
// (klik chip ke-2 secara urutan — localname bisa kembar antar pohon)
const p2 = POHON[1];
const target2 = String(p2.localname || p2.idpohon);
await page.locator("[data-testid='chip-pohon'] button").nth(1).click();
await page.waitForURL(new RegExp(`pohon=${encodeURIComponent(String(p2.idpohon))}`), { timeout: 15000 });
await page.waitForFunction(
  (t) => (document.querySelector("[data-testid='share-design']")?.textContent ?? "").toLowerCase().includes(t),
  target2.toLowerCase(),
  { timeout: 15000 },
);
ok("klik chip pohon ke-2 → design menampilkan pohon itu", true, target2);

// Kembali ke template A (putih polos) agar asersi piksel isi PNG deterministik
await page.locator(`[data-testid='tile-template'] button:has-text("${tNama} A")`).click();
await page.waitForFunction(
  (f) => !!document.querySelector("[data-testid='share-design'] img")?.getAttribute("src")?.includes(f),
  ASSET_A,
  { timeout: 15000 },
);

// ===== 5. Unduh PNG → IHDR 1080×1920 =====
const unduhBtn = page.locator("[data-testid='unduh-share']");
await unduhBtn.waitFor({ timeout: 30000 }); // pre-generate blob di latar
await page.waitForFunction(() => !document.querySelector("[data-testid='unduh-share']")?.disabled, null, { timeout: 60000 });
const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), unduhBtn.click()]);
const pngBuf = fs.readFileSync(await download.path());
const w = pngBuf.readUInt32BE(16);
const h = pngBuf.readUInt32BE(20);
ok(`unduh PNG ${w}×${h} (IHDR)`, w === 1080 && h === 1920, `${download.suggestedFilename()}`);

// Isi PNG mode template format hadiah: teks dinamis TERISI di zona template
// (donatur ±27%, kalimat ±28-33%, penerima ±39%, nilai kartu ±50-56%, pil
// certnum bawah) dan band gelap bawaan TIDAK meniban template (regresi race
// canvas + regresi layout band). Template A putih polos → hitungan piksel
// teks gelap deterministik.
const piksel = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = `data:image/png;base64,${b64}`;
  });
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
  const hitung = (x0, y0, x1, y1, pred, step = 3) => {
    let n = 0;
    for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
      const [r, g, b] = px(x, y);
      if (pred(r, g, b)) n++;
    }
    return n;
  };
  const teksGelap = (r, g, b) => r < 120 && g < 150 && b < 140;
  const putih = (r, g, b) => r > 225 && g > 225 && b > 218;
  return {
    atas: px(540, 60),
    bawah: px(80, 1870), // x=80 — di luar pil certnum yang terpusat
    donatur: hitung(80, 380, 1000, 530, teksGelap),
    kalimat: hitung(80, 545, 1000, 650, teksGelap),
    penerima: hitung(80, 650, 1000, 762, teksGelap),
    stat: hitung(60, 940, 1020, 1115, teksGelap),
    // emerald-950/75 di atas putih ≈ (65,97,89)
    certPil: hitung(200, 1850, 880, 1900, (r, g, b) => r < 95 && g < 130 && b < 120 && g > r, 2),
  };
}, pngBuf.toString("base64"));
const bandGelap = (p) => p[1] > p[0] + 8 && p[1] > p[2] + 5 && p[0] < 90;
ok(
  "isi PNG: band gelap bawaan TIDAK meniban template",
  !bandGelap(piksel.atas) && !bandGelap(piksel.bawah),
  `atas=${piksel.atas} bawah=${piksel.bawah}`,
);
ok("isi PNG: nama donatur terisi di garis ±27%", piksel.donatur >= 250, `${piksel.donatur} px gelap`);
ok("isi PNG: kalimat hadiah terisi ±28-33%", piksel.kalimat >= 100, `${piksel.kalimat}`);
ok("isi PNG: nama penerima terisi di garis ±39%", piksel.penerima >= 200, `${piksel.penerima}`);
ok("isi PNG: nilai kartu statistik terisi (pohon/desa/tahun)", piksel.stat >= 80, `${piksel.stat}`);
ok("isi PNG: pil certnum tampil di bawah", piksel.certPil >= 100, `${piksel.certPil} px pil`);
ok(
  "design memuat certnum di teks",
  ((await page.locator("[data-testid='share-design']").textContent()) ?? "").includes(CERT),
);
fs.rmSync(await download.path(), { force: true });

// ===== 6. Semua template nonaktif → fallback gradient =====
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE template_share SET aktif=0 WHERE id IN (${ID_A},${ID_B})" 2>/dev/null`);
await page.goto(shareUrl, { waitUntil: "networkidle" });
ok("tanpa template aktif → gradient kembali", (await page.locator("[data-testid='share-design'] img").count()) === 0);
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE template_share SET aktif=1 WHERE id IN (${ID_A},${ID_B})" 2>/dev/null`);

// ===== 7. Admin level 1: CRUD template share via UI =====
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminCtx.addCookies([{ name: "pa_session", value: await signToken({ userId: 2682, name: "Admin QA", role: "ADMIN", level: 1 }), url: BASE }]);
const a = await adminCtx.newPage();
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (pola features-check)
await a.addInitScript(() => {
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

await a.goto(`${BASE}/admin/template-share`, { waitUntil: "networkidle" });
ok("admin: halaman list + grup desa tampil", (await a.locator("h2", { hasText: DESA }).count()) === 1);

// Tambah (upload PNG 1×1 ≤2MB)
await a.click("summary:has-text('Tambah Template')");
await a.selectOption('select[name="desa"]', DESA);
await a.fill('input[name="nama"]', `${tNama} UI`);
await a.fill('input[name="subtext"]', "Hutan Adat Uji UI");
const PNG1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
await a.setInputFiles('input[type="file"]', { name: "e2e-tpl.png", mimeType: "image/png", buffer: PNG1x1 });
await a.click('form:has(select[name="desa"]) button[type=submit]');
await a.waitForURL("**/admin/template-share?created=1", { timeout: 30000 });
const UI_ID = Number(rows(`SELECT id FROM template_share WHERE nama='${tNama} UI'`)[0]?.[0]);
const UI_FILE = rows(`SELECT file FROM template_share WHERE id=${UI_ID}`)[0]?.[0];
ok("admin: tambah via UI (upload) → row DB + file cover_*", !!UI_ID && /^cover_/.test(UI_FILE ?? ""), `id=${UI_ID} file=${UI_FILE}`);
const UI_SUBTEXT = rows(`SELECT subtext FROM template_share WHERE id=${UI_ID}`)[0]?.[0];
ok("admin: subtext tersimpan via UI", UI_SUBTEXT === "Hutan Adat Uji UI", `subtext=${UI_SUBTEXT}`);

// Pratinjau design (modal) di baris tabel + lightbox besar saat design diklik
await a.click(`tr:has-text("${tNama} UI") button:has-text("Pratinjau")`);
ok(
  "admin: pratinjau design tampil dalam modal",
  (await a.locator("[data-testid='preview-modal'] [data-testid='share-design']").count()) === 1,
);
await a.click("[data-testid='preview-modal'] [data-testid='share-design']");
ok(
  "admin: klik design → lightbox besar (galeri)",
  (await a.locator("[data-testid='preview-lightbox']").count()) === 1,
);
await a.click("[data-testid='lightbox-close']");
await a.locator("[data-testid='preview-lightbox']").waitFor({ state: "detached" });
await a.click("[data-testid='preview-close']");
await a.locator("[data-testid='preview-modal']").waitFor({ state: "detached" });

// Edit: ganti nama + jadikan utama → A kehilangan utama
await a.goto(`${BASE}/admin/template-share/${UI_ID}/edit`, { waitUntil: "networkidle" });
ok("admin: edit form memuat subtext", (await a.inputValue('input[name="subtext"]')) === "Hutan Adat Uji UI");
await a.fill('input[name="nama"]', `${tNama} UI2`);
await a.check('input[name="utama"]');
await a.click('form:has(input[name="nama"]) button[type=submit]');
await a.waitForURL("**/admin/template-share?saved=1", { timeout: 30000 });
const [namaDb, utamaUi, utamaA] = rows(
  `SELECT (SELECT nama FROM template_share WHERE id=${UI_ID}), (SELECT utama FROM template_share WHERE id=${UI_ID}), (SELECT utama FROM template_share WHERE id=${ID_A})`,
)[0];
ok("admin: edit nama + set utama → DB", namaDb === `${tNama} UI2` && utamaUi === "1", `nama=${namaDb} utama=${utamaUi}`);
ok("admin: set utama baru → template lama otomatis non-utama", utamaA === "0");

// Hapus via UI
await a.goto(`${BASE}/admin/template-share`, { waitUntil: "networkidle" });
await a.click(`tr:has-text("${tNama} UI2") button:has-text("Hapus")`);
await a.waitForURL("**/admin/template-share?deleted=1", { timeout: 30000 });
ok("admin: hapus via UI → row hilang", rows(`SELECT COUNT(*) FROM template_share WHERE id=${UI_ID}`)[0][0] === "0");
if (UI_FILE) execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/assets/${UI_FILE}`);
ok("cleanup: file upload dihapus (nama spesifik)", true, UI_FILE);

// ===== 8. Scoping petugas (API, desa rantaukermas milik petugas 2646) =====
const DESA_PETUGAS = rows("SELECT d.nama FROM desa_petugas p JOIN desa d ON d.id=p.iddesa WHERE p.idpetugas=2646")[0][0];
const post = (ep, body) => fetch(`${API}/${ep}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const tolak = await post("tambahtemplateshare", { desa: DESA, nama: "E2E tolak", file: ASSET_A, utama: 0, idpetugas: 2646 });
ok("API: petugas DITOLAK menambah template desa lain (403)", Number(tolak.value) === 403, tolak.pesan);
const terima = await post("tambahtemplateshare", { desa: DESA_PETUGAS, nama: `${tNama} Petugas`, file: ASSET_A, utama: 1, idpetugas: 2646 });
const ID_PTG = Number(rows(`SELECT id FROM template_share WHERE nama='${tNama} Petugas'`)[0]?.[0]);
ok("API: petugas boleh menambah template desanya", Number(terima.value) === 200 && !!ID_PTG, `id=${ID_PTG} desa=${DESA_PETUGAS}`);
const scoped = await (await fetch(`${API}/templatesharelist?idpetugas=2646`)).json();
ok(
  "API: templatesharelist?idpetugas= hanya desa miliknya",
  Array.isArray(scoped) && scoped.length >= 1 && scoped.every((r) => r.desa === DESA_PETUGAS),
  `${scoped.length} row, semua ${DESA_PETUGAS}`,
);
const hapusPtg = await post("hapustemplateshare", { id: ID_PTG, idpetugas: 2646 });
ok("API: petugas hapus template milik desanya", Number(hapusPtg.value) === 200);

// ===== 9. Cleanup fixture =====
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM template_share WHERE id IN (${ID_A},${ID_B})" 2>/dev/null`);
execSync(`rm -f /opt/homebrew/var/www/restApiPohonasuh/public/assets/${ASSET_A}`);
ok("cleanup: fixture template_share dihapus", rows("SELECT COUNT(*) FROM template_share")[0][0] === "0");

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
