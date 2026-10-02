// Verifikasi DOM halaman sertifikat baru: teks persis + posisi overlay
// (kalibrasi koordinat dari PDF template, toleransi 1.2% page).
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const assert = (c, m) => {
  if (!c) { console.error("✗ GAGAL:", m); process.exit(1); }
  console.log("✓", m);
};

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString().trim().split("\n").filter(Boolean).map((l) => l.split("\t"));

// Fixture kasus 1: sertifikat web terbaru dari e2e-adopsi.mjs (urut+
// tanggal berubah tiap run → ambil dinamis dari DB).
const [CERT1, NAMA1, TGL_ADOPT, TGL_EXP] = rows(
  "SELECT certnum, nama, tgl_adopt, tgl_exp FROM data_adopsi WHERE nama='E2E Tester Web' AND certnum LIKE '%/LPHD-RA/%' ORDER BY id DESC LIMIT 1",
)[0] ?? [];
if (!CERT1) throw new Error("fixture hilang: jalankan scripts/e2e-adopsi.mjs dulu");
const bulanEn = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtEn = (ymd) => {
  const [y, m, d] = ymd.split("-");
  return `${bulanEn[Number(m) - 1]} ${Number(d)}, ${y}`;
};
const CERT1_URL = encodeURIComponent(CERT1);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function buka(kode) {
  await page.goto(`${BASE}/sertifikat/${kode}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const sheet = document.querySelector(".pa-sertifikat");
    const r = sheet.getBoundingClientRect();
    const pct = (el) => {
      const b = el.getBoundingClientRect();
      return { top: ((b.top - r.top) / r.height) * 100, left: ((b.left - r.left) / r.width) * 100 };
    };
    const ps = [...sheet.querySelectorAll("p, span")];
    const byText = (t) => ps.find((p) => p.textContent.includes(t));
    return {
      w: r.width, h: r.height,
      certno: byText("No.")?.textContent ?? null,
      nama: sheet.querySelector("[class*='font-cert-title']")?.textContent ?? null,
      certnoPos: byText("No.") ? pct(byText("No.")) : null,
      namaPos: byText("We give") ? null : null,
      body: ps.find((p) => p.textContent.includes("has adopted"))?.textContent ?? null,
      bodyPos: ps.find((p) => p.textContent.includes("has adopted")) ? pct(ps.find((p) => p.textContent.includes("has adopted"))) : null,
      jambi: ps.find((p) => p.textContent.startsWith("Jambi,"))?.textContent ?? null,
      memoLabel: !!byText("Message and Impression:"),
      memoText: byText("Message and Impression:")?.nextElementSibling?.textContent ?? null,
      imgOK: [...sheet.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0),
    };
  });
}

// ---- Kasus 1: order web (memo kosong, rantaukermas) ----
let d = await buka(CERT1_URL);
assert(d.certno === `No.${CERT1}`, `nomor sertifikat (${d.certno})`);
assert(d.nama.trim() === NAMA1, `nama penerima (${d.nama})`);
assert(
  d.body.includes("has adopted 1 tree in Rantaukermas Village Forest, Alam Barajo Subdistrict, Kota Jambi District, Jambi Province, INDONESIA. from ") &&
    d.body.includes(`from ${TGL_ADOPT} until ${TGL_EXP}.`),
  `body lengkap: ${d.body}`,
);
assert(d.jambi === `Jambi, ${fmtEn(TGL_ADOPT)}`, `tanggal ttd (${d.jambi})`);
assert(!d.memoLabel, "memo kosong → label & pesan tidak dirender");
assert(d.imgOK, "background template termuat");
assert(Math.abs(d.certnoPos.top - 2.27) < 1.5 && Math.abs(d.certnoPos.left - 79) < 3, `posisi certno (${JSON.stringify(d.certnoPos)})`);
assert(Math.abs(d.bodyPos.top - 47.95) < 1.5 && Math.abs(d.bodyPos.left - 23.75) < 1, `posisi body (${JSON.stringify(d.bodyPos)})`);

// ---- Kasus 2: multi-pohon 4 + fallback nama Park Jimin ----
d = await buka("220%2FKPHD-RK%2F2016");
assert(d.nama.trim() === "Park Jimin", `fallback nama member (${d.nama})`);
assert(d.body.includes("has adopted 4 trees in"), `4 trees (${d.body.slice(0, 60)})`);
assert(d.body.includes("until —."), `tgl_exp NULL → tampil "—" (${d.body.slice(-40)})`);
assert(d.jambi === "Jambi, July 26, 2016", `jambi 2016 (${d.jambi})`);

// ---- Kasus 3: memo terisi ----
d = await buka("223%2FKPHD-RK%2F2016%20");
assert(d.nama.trim() === "Papa Indra and Mama Farida", `nama (${d.nama})`);
assert(d.memoLabel, "label Message and Impression tampil");
assert(d.memoText?.includes("Semoga oksigennya bermanfaat"), `isi memo (${d.memoText?.slice(0, 50)})`);
assert(d.body.includes("has adopted 1 tree in"), "body 1 tree");

// ---- Kasus 4: nama panjang mengecil (fit) ----
await page.goto(`${BASE}/sertifikat/${CERT1_URL}`, { waitUntil: "networkidle" });
const fitOk = await page.evaluate(() => {
  const namaEl = document.querySelector(".pa-sertifikat h1");
  return namaEl && namaEl.scrollWidth <= namaEl.parentElement.clientWidth + 1;
});
assert(fitOk, "nama tidak overflow (fit ok)");

// ---- Kasus 5: certnum tak dikenal → UI not-found ----
// (loading.tsx di (site) membuat shell streaming terkirim dgn status 200,
//  jadi notFound() tak bisa mengubah status — cek UI, bukan kode HTTP.)
await page.goto(`${BASE}/sertifikat/999%2FXXX%2F9999`);
await page.waitForTimeout(300);
const notFoundShown = await page.evaluate(
  () => !document.querySelector(".pa-sertifikat") && /could not be found|tidak ditemukan/i.test(document.body.textContent),
);
assert(notFoundShown, "certnum tak dikenal → halaman not-found (bukan lembar sertifikat)");

await browser.close();
console.log("\n=== VERIFIKASI DOM SERTIFIKAT LULUS ===");
