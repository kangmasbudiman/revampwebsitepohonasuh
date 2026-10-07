// Smoke test produksi (pohonasuh.io) untuk 3 fitur 2026-10-07:
//   F1 Kelola Profil (edit nama + upload foto) — fixture member sendiri
//   F3 Kirim Sertifikat Hadiah (modal WA + email fail-soft SMTP)
//   F2 Multi-bahasa (toggle EN/ID live + SSR)
// DB via ssh docker exec mysql (pola uji-vps-mayar); semua fixture dibersihkan.
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const assert = (c, m) => {
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

// ============== Fixture cleanup (prefix e2e_vps3f_) ==============
for (const id of rows(`SELECT id FROM member WHERE emaile LIKE 'e2e_vps3f_%'`).map((r) => r[0])) {
  execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/profil/profil_${id}_*"`);
  rows(`DELETE FROM data_adopsi WHERE pengasuh=${id}`);
  rows(`DELETE FROM confirmation WHERE idpengasuh=${id}`);
  rows(`DELETE FROM data_basket WHERE id_member=${id}`);
  rows(`DELETE FROM pesan_notif WHERE idmember=${id}`);
  rows(`DELETE FROM member WHERE id=${id}`);
}
execSync(
  `sips -s format jpeg -Z 400 public/images/Lokasi-Pohon-Asuh-2023.jpg --out /tmp/profil-e2e.jpg >/dev/null 2>&1`,
);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

// ============== F2: toggle EN/ID live ==============
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.click('div[role="group"] button:text-is("en")');
await page.waitForTimeout(900);
assert(
  await page.locator('section[aria-roledescription="carousel"] a:has-text("Adopt a Tree Now")').first().isVisible().catch(() => false),
  "F2 toggle→EN: hero CTA 'Adopt a Tree Now'",
);
assert(await page.getByText("Sign Up Now", { exact: true }).first().isVisible().catch(() => false), "F2 toggle→EN: CTA 'Sign Up Now'");
await page.click('div[role="group"] button:text-is("id")');
await page.waitForTimeout(900);
assert(
  await page.locator('section[aria-roledescription="carousel"] a:has-text("Adopsi Pohon Sekarang")').first().isVisible().catch(() => false),
  "F2 toggle→ID kembali: hero CTA 'Adopsi Pohon Sekarang'",
);

// ============== Daftar member uji ==============
const email = `e2e_vps3f_${Date.now()}@test.local`;
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E VPS 3F");
await page.fill("#email", email);
await page.fill("#phone", `0813${String(Date.now()).slice(-8)}`);
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL("**/dashboard", { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!MEMBER_ID, `F1 member terbuat id=${MEMBER_ID}`);

// ============== F1: edit nama ==============
await page.goto(`${BASE}/dashboard/profil`, { waitUntil: "networkidle" });
assert(await page.getByText("Profil Saya", { exact: true }).first().isVisible(), "F1 halaman /dashboard/profil termuat");
const formDiri = page.locator("form").filter({ has: page.locator("#name") });
await formDiri.locator("#name").fill("E2E VPS 3F Ganti Nama");
await formDiri.locator('button[type=submit]').click();
await page.waitForURL(/saved=data/, { timeout: 20000 });
assert(await page.getByText("Profil berhasil disimpan.", { exact: true }).isVisible(), "F1 pesan tersimpan tampil");
assert(
  rows(`SELECT name FROM member WHERE id=${MEMBER_ID}`)[0][0] === "E2E VPS 3F Ganti Nama",
  "F1 DB: nama ter-update",
);

// ============== F1: upload foto profil (permission upload/profil) ==============
await page.setInputFiles('input[name="foto"]', "/tmp/profil-e2e.jpg");
await page.getByRole("button", { name: "Simpan Foto" }).click();
await page.waitForURL(/saved=foto/, { timeout: 30000 });
assert(await page.getByText("Foto profil berhasil diperbarui.", { exact: true }).isVisible(), "F1 pesan foto tampil");
const fotoDb = rows(`SELECT foto FROM member WHERE id=${MEMBER_ID}`)[0][0];
assert(fotoDb.includes("/upload/profil/profil_"), `F1 DB: member.foto terisi (${fotoDb.split("/").pop()})`);
assert((await fetch(fotoDb)).status === 200, `F1 URL foto 200 (${fotoDb})`);
execSync("mkdir -p screenshots");

// ============== F3: fixture order hadiah ACTIVE ==============
const [TREE, DESA, HARGA] = rows(
  "SELECT idpohon, desa, harga FROM data_pohon WHERE adopted='available' ORDER BY id LIMIT 1",
)[0];
const TS = Date.now().toString(36).toUpperCase();
const tgl = new Date().toISOString().slice(0, 10);
const inv = `#V${TS}A`;
rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation) VALUES ('${inv}','${tgl}',${MEMBER_ID},'E2E VPS 3F','${email}','Transfer','IDR',${Number(HARGA) + 321},'${tgl}',1,'yes')`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,gfrom,certnum,dur,memo,admin,proses,invoice,tgl_exp) VALUES ('${TREE}','${DESA}',${MEMBER_ID},'Gift Recipient VPS',${HARGA},'IDR','Transfer','${tgl}',0,'9V/E2E3F/${TS}',1,'',0,3,'${inv}',DATE_ADD('${tgl}', INTERVAL 1 YEAR))`,
);
const CONF = rows(`SELECT id FROM confirmation WHERE invoice='${inv}'`)[0][0];
assert(!!CONF, `F3 fixture order ACTIVE terbuat (conf=${CONF})`);

// chrome sertifikat EN (pa_lang=en via fetch) — lembar tetap Inggris
const certnum = rows(`SELECT certnum FROM data_adopsi WHERE invoice='${inv}'`)[0][0];
const enc = encodeURIComponent(certnum);
const certEn = await (await fetch(`${BASE}/sertifikat/${enc}`, { headers: { cookie: "pa_lang=en" } })).text();
assert(certEn.includes("Certificate verified"), "F2 sertifikat chrome EN 'Certificate verified'");
assert(certEn.includes("has adopted"), "F2/F3 lembar sertifikat tetap Inggris");

// ============== F3: modal kirim hadiah ==============
await page.goto(`${BASE}/dashboard/adopsi/${CONF}`, { waitUntil: "networkidle" });
const kirim = page.getByRole("button", { name: "Kirim ke Penerima" });
if (await kirim.count()) {
  await kirim.first().click();
  await page.waitForTimeout(400);
  assert(await page.getByText("Kirim Sertifikat Hadiah", { exact: true }).isVisible(), "F3 modal terbuka");
  const waText = await page.locator("textarea, p, div").filter({ hasText: "menghadiahkan adopsi pohon" }).first().textContent();
  assert(waText?.includes(certnum.split("/")[0]) || waText?.includes("Lihat sertifikatnya"), "F3 template WA berisi pesan + link");

  // email → fail-soft sampai SMTP dikonfigurasi
  await page.fill('input[name="to_email"]', email);
  await page.click('form:has(input[name="to_email"]) button[type=submit]');
  await page.waitForTimeout(2500);
  const gagal = await page.getByText("SMTP belum dikonfigurasi", { exact: false }).first().isVisible().catch(() => false);
  assert(gagal, "F3 email fail-soft 'SMTP belum dikonfigurasi' (diharapkan sampai MAIL_* diisi)");
} else {
  assert(false, "F3 tombol 'Kirim ke Penerima' tidak ditemukan");
}

await page.screenshot({ path: "screenshots/vps-3fitur-gift.png" });

// ============== Cleanup ==============
execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/profil/profil_${MEMBER_ID}_*"`);
rows(`DELETE FROM data_adopsi WHERE pengasuh=${MEMBER_ID}`);
rows(`DELETE FROM confirmation WHERE idpengasuh=${MEMBER_ID}`);
rows(`DELETE FROM pesan_notif WHERE idmember=${MEMBER_ID}`);
rows(`DELETE FROM member WHERE id=${MEMBER_ID}`);
assert(true, "cleanup fixture member + foto + order");

await browser.close();
if (process.exitCode) {
  console.error("\nUJI VPS 3 FITUR: GAGAL");
  process.exit(1);
}
console.log("\nUJI VPS 3 FITUR: SEMUA LULUS");
