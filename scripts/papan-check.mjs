// E2E fitur "Papan Taging" (/admin/tagging/[id]/papan — paritas Form Taging
// mobile download_form_taging): pratinjau papan (template + overlay teks +
// QR koordinat), tombol dari kartu order, cetak A4 lanskap terisolasi dari
// chrome admin. Login petugas (level 2) dgn order dummy di rantaukermas;
// fixture dibersihkan di awal & akhir.
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

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: 2683, name: "Petugas E2E", role: "ADMIN", level: 2 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

// ================= Fixture (cleanup sisa run lalu pasang dummy) =================
const INVOICE = "PAPAN-E2E";
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
const [KODE, LOCALNAME, DIAMETER, LAT, LNG] = rows(
  "SELECT idpohon, localname, diameter, latitude, longitude FROM data_pohon WHERE idpohon='A168'",
)[0];
assert(Boolean(KODE), `pohon fixture A168 ada (${LOCALNAME})`);
const [KEC, KAB, PROV] = rows(
  "SELECT IFNULL(kecamatan,''), IFNULL(kabupaten,''), IFNULL(provinsi,'') FROM desa WHERE nama='rantaukermas'",
)[0];

rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),2683,'E2E Papan','e2e@papan.test','transfer','IDR',100000,CURDATE(),1,'yes','E2E',NOW(),NOW())`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('A168','rantaukermas',2683,'Uji Papan E2E',100000,'IDR','transfer',CURDATE(),'',0,1,'${INVOICE}','2029-09-26',NOW(),NOW())`,
);
const ADOPSI_ID = rows(`SELECT id FROM data_adopsi WHERE invoice='${INVOICE}'`)[0][0];
assert(Boolean(ADOPSI_ID), `order dummy tersimpan (id ${ADOPSI_ID})`);

fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

// ================= 1. Tombol papan di kartu order =================
await page.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
const kartu = page.locator("main .rounded-2xl", { hasText: INVOICE }).first();
await kartu.waitFor({ timeout: 30000 });
assert((await kartu.getByRole("link", { name: "Papan Taging" }).count()) === 1, "kartu order punya tombol Papan Taging");
await kartu.getByRole("link", { name: "Papan Taging" }).click();
await page.waitForURL(`**/admin/tagging/${ADOPSI_ID}/papan`, { timeout: 30000 });
assert(true, "klik → halaman papan order itu");

// ================= 2. Papan dirender sesuai desain mobile =================
await page.locator(".pa-papan").waitFor({ timeout: 15000 });
const cekPapan = await page.evaluate(() => {
  const img = document.querySelector(".pa-papan img");
  const teks = document.querySelector(".pa-papan").textContent;
  return {
    templateOk: !!img && img.complete && img.naturalWidth > 0,
    teks,
    qrSvg: document.querySelectorAll(".pa-papan svg").length,
    font: getComputedStyle(document.querySelector(".pa-papan")).fontFamily,
  };
});
assert(cekPapan.templateOk, "template papan_taging_v2 termuat");
assert(cekPapan.teks.includes("Desa Rantaukermas"), "judul desa (kapital) di papan");
if (KEC || KAB || PROV) {
  // komponen merapikan spasi + Title Case per kata (kapital ala mobile)
  const kap = (s) =>
    s
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
  const sub = [KEC && `Kec. ${kap(KEC)}`, KAB && `Kab. ${kap(KAB)}`, PROV && `Provinsi ${kap(PROV)}`]
    .filter(Boolean)
    .join(", ");
  assert(cekPapan.teks.includes(sub), `sublokasi "${sub}" di papan`);
}
assert(cekPapan.teks.includes("Uji Papan E2E"), "nama pengasuh di banner");
for (const [label, nilai] of [
  ["ID", KODE],
  ["Nama Pohon", LOCALNAME],
  ["Diameter", `${DIAMETER} Cm`],
  ["Koordinat", `${LNG}°, ${LAT}°`],
  ["Berlaku", "26 Sep 2029"],
]) {
  assert(cekPapan.teks.includes(label) && cekPapan.teks.includes(nilai), `baris ${label}: ${nilai}`);
}
assert(cekPapan.qrSvg >= 1, "QR koordinat dirender (SVG)");
assert(/playfair/i.test(cekPapan.font), "font Playfair Display terpasang");
assert((await page.getByRole("button", { name: /Cetak/i }).count()) === 1, "tombol Cetak / Simpan PDF ada");
assert((await page.getByText(INVOICE).count()) >= 1, "kartu detail memuat invoice");

await page.locator(".pa-papan-wrap").screenshot({ path: "screenshots/papan-taging.png" });

// ================= 3. Cetak: A4 lanskap + chrome admin hilang =================
await page.emulateMedia({ media: "print" });
const cetak = await page.evaluate(() => {
  const aside = document.querySelector("aside");
  const header = document.querySelector("header");
  const w = document.querySelector(".pa-papan-wrap");
  return {
    sidebarHilang: !aside || getComputedStyle(aside).display === "none",
    topbarHilang: !header || getComputedStyle(header).display === "none",
    lebarMm: w ? Math.round((parseFloat(getComputedStyle(w).width) / 96) * 25.4) : 0,
    page: w ? getComputedStyle(w).page : "",
  };
});
await page.emulateMedia({ media: "screen" });
assert(cetak.sidebarHilang && cetak.topbarHilang, "sidebar & topbar tak tercetak");
assert(cetak.lebarMm >= 295 && cetak.lebarMm <= 299, `papan tercetak selebar A4 lanskap (${cetak.lebarMm} mm)`);
assert(cetak.page === "papan", "named page papan (A4 lanskap, margin 0)");

// ================= 4. Order asing / tak dikenal → 404 =================
await page.goto(`${BASE}/admin/tagging/99999999/papan`, { waitUntil: "networkidle" });
assert((await page.getByText("404").count()) >= 1, "order tak dikenal → halaman 404");

// ================= Cleanup =================
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
console.log("✓ cleanup fixture papan");

await browser.close();
console.log("=== SEMUA TES PAPAN TAGING LULUS ===");
