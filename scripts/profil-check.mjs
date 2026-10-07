// E2E Kelola Profil: halaman /dashboard/profil (fitur 2026-10-07).
//   1. Guard: tanpa login → redirect /masuk
//   2. Halaman profil: 3 section (foto, data diri, password) + menu "Profil" di header
//   3. Edit nama+hp → DB berubah + nama baru di header (session ter-update)
//   4. HP duplikat milik member lain → error 409 dari backend
//   5. Upload foto <2MB → member.foto terisi + Avatar render <img> + file di upload/profil
//   6. Upload file >2MB → diblokir klien (FileInput), DB tak berubah
//   7. Password lama salah → pesan error; benar → ?saved=pw + login ulang sukses
//   8. Dropdown admin: link "Profil" tampil & halaman valid untuk sesi ADMIN
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
const LARAVEL_PUBLIC = "/opt/homebrew/var/www/restApiPohonasuh/public";

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

const tunggu = async (fn, msg, timeout = 10000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timeout menunggu: ${msg}`);
};

// ============== Fixture ==============
for (const id of rows(`SELECT id FROM member WHERE emaile LIKE 'e2e_profil_%'`).map((r) => r[0])) {
  execSync(`rm -f ${LARAVEL_PUBLIC}/upload/profil/profil_${id}_*`);
  rows(`DELETE FROM pesan_notif WHERE idmember=${id}`);
  rows(`DELETE FROM data_basket WHERE id_member=${id}`);
  rows(`DELETE FROM confirmation WHERE idpengasuh=${id}`);
  rows(`DELETE FROM member WHERE id=${id}`);
}
// file foto uji
execSync(`sips -s format jpeg -Z 400 public/images/Lokasi-Pohon-Asuh-2023.jpg --out /tmp/profil-e2e.jpg >/dev/null 2>&1`);
execSync(`head -c 2500000 /dev/urandom > /tmp/profil-besar.jpg`);

const browser = await chromium.launch();
const email = `e2e_profil_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Profil Lama");
await page.fill("#email", email);
await page.fill("#phone", "081234567801");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(!!MEMBER_ID, `member terbuat id=${MEMBER_ID}`);
assert(
  rows(`SELECT CONCAT('[',IFNULL(foto,''),']') FROM member WHERE id=${MEMBER_ID}`)[0][0] === "[]",
  "foto awal kosong di DB",
);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const token = await new SignJWT({ userId: Number(MEMBER_ID), name: "E2E Profil Lama", role: "DONOR" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);

// ============== 1. Guard tanpa login ==============
const anon = await browser.newContext();
const anonPage = await anon.newPage();
await anonPage.goto(`${BASE}/dashboard/profil`, { waitUntil: "domcontentloaded" });
await anonPage.waitForURL(/\/masuk/, { timeout: 15000 });
assert(true, "tanpa login → dialihkan ke /masuk");
await anon.close();

// ============== 2. Halaman profil ==============
await page.goto(`${BASE}/dashboard/profil`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Foto Profil", { timeout: 15000 });
assert(true, "halaman /dashboard/profil memuat");
assert((await page.getByText("Data Diri", { exact: true }).count()) === 1, "section Data Diri ada");
assert((await page.getByText("Ganti Password", { exact: true }).count()) >= 1, "section Ganti Password ada");
assert((await page.locator("#name").inputValue()) === "E2E Profil Lama", "form terisi data getprofil");
// avatar inisial (belum ada foto) di header
assert(
  (await page.locator("header span[aria-hidden]", { hasText: "E" }).count()) >= 1,
  "header: avatar inisial sebelum foto",
);

// ============== 3. Edit nama + hp ==============
const NAMA_BARU = "E2E Profil Baru";
// HP unik per-run — 081234567899 sudah dipakai fixture e2e-adopsi lama
const HP_BARU = `0899${String(Date.now()).slice(-8)}`;
await page.fill("#name", NAMA_BARU);
await page.fill("#hp", HP_BARU);
await page.fill("#job", "Penguji E2E");
await page.fill("#address", "Jl. Uji No. 1");
await page.getByRole("button", { name: "Simpan Perubahan" }).click();
await page.waitForURL(/saved=data/, { timeout: 20000 });
assert(true, "redirect ?saved=data setelah simpan");
assert(
  rows(`SELECT name FROM member WHERE id=${MEMBER_ID}`)[0][0] === NAMA_BARU,
  `DB: nama berubah → "${NAMA_BARU}"`,
);
assert(rows(`SELECT hp FROM member WHERE id=${MEMBER_ID}`)[0][0] === HP_BARU, "DB: hp berubah");
assert(
  rows(`SELECT CONCAT('[',job,']') FROM member WHERE id=${MEMBER_ID}`)[0][0] === "[Penguji E2E]",
  "DB: job terisi",
);
assert(
  rows(`SELECT CONCAT('[',IFNULL(address,''),']') FROM member WHERE id=${MEMBER_ID}`)[0][0] === "[Jl. Uji No. 1]",
  "DB: address terisi",
);
await tunggu(
  async () => (await page.locator("header").getByText(NAMA_BARU, { exact: true }).count()) >= 1,
  "nama baru muncul di header",
);
assert(true, "header menampilkan nama baru (session ter-update)");

// ============== 4. HP duplikat ==============
const hpLain = rows(`SELECT hp FROM member WHERE hp IS NOT NULL AND hp != '' AND id != ${MEMBER_ID} LIMIT 1`)[0][0];
await page.fill("#hp", hpLain);
await page.getByRole("button", { name: "Simpan Perubahan" }).click();
await page.waitForSelector("text=Nomor HP sudah dipakai akun lain", { timeout: 15000 });
assert(true, `hp duplikat (${hpLain}) → pesan 409 tampil`);
assert(rows(`SELECT hp FROM member WHERE id=${MEMBER_ID}`)[0][0] === HP_BARU, "DB: hp tidak berubah");

// ============== 5. Upload foto ==============
await page.setInputFiles('input[name="foto"]', "/tmp/profil-e2e.jpg");
await page.getByRole("button", { name: "Simpan Foto" }).click();
await page.waitForURL(/saved=foto/, { timeout: 20000 });
assert(true, "redirect ?saved=foto setelah upload");
const fotoDb = rows(`SELECT foto FROM member WHERE id=${MEMBER_ID}`)[0][0];
assert(fotoDb.includes("/upload/profil/profil_"), `DB: member.foto terisi (${fotoDb.split("/").pop()})`);
const fileFisik = `${LARAVEL_PUBLIC}/upload/profil/${fotoDb.split("/").pop()}`;
assert(fs.existsSync(fileFisik), "file fisik ada di public/upload/profil");
// Avatar kini render <img> (bukan inisial) — di header & form
await page.waitForSelector(`img[src*="profil"]`, { timeout: 15000 });
assert(
  (await page.locator("header img[src*='profil']").count()) === 1,
  "header: Avatar merender <img> foto",
);
// loginuser kini bawa foto
const loginRes = await fetch(`${API}/loginuser`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ emaile: email, passe: "rahasia123" }),
}).then((r) => r.json());
assert(loginRes.foto === fotoDb, "loginuser mengembalikan foto");

// ============== 6. File >2MB diblokir klien ==============
await page.setInputFiles('input[name="foto"]', "/tmp/profil-besar.jpg");
await page.waitForSelector('[data-testid="file-error"]', { timeout: 10000 });
assert(true, "FileInput menampilkan error ukuran >2MB");
assert(
  (await page.locator('input[name="foto"]').inputValue()) === "",
  "input file dikosongkan (file tak terkirim)",
);
// guard FileInput memblokir submit selama error aktif — reset pilihan dulu,
// lalu submit tanpa file → validasi ramah dari server action
await page.setInputFiles('input[name="foto"]', []);
await page.getByRole("button", { name: "Simpan Foto" }).click();
await page.waitForSelector("text=Pilih file foto terlebih dahulu", { timeout: 15000 });
assert(true, "submit tanpa file → pesan ramah (bukan bubble native)");
assert(rows(`SELECT foto FROM member WHERE id=${MEMBER_ID}`)[0][0] === fotoDb, "DB: foto tidak berubah");

// ============== 7. Ganti password ==============
await page.fill("#passe_lama", "passwordsalah");
await page.fill("#passe_baru", "passwordbaru99");
await page.fill("#passe_konfirmasi", "passwordbaru99");
await page.getByRole("button", { name: "Ganti Password" }).click();
await page.waitForSelector("text=Password lama tidak sesuai", { timeout: 15000 });
assert(true, "password lama salah → pesan error");
// konfirmasi tidak cocok
await page.fill("#passe_lama", "rahasia123");
await page.fill("#passe_baru", "passwordbaru99");
await page.fill("#passe_konfirmasi", "beda123");
await page.getByRole("button", { name: "Ganti Password" }).click();
await page.waitForSelector("text=Konfirmasi password tidak cocok", { timeout: 15000 });
assert(true, "konfirmasi beda → pesan error");
// benar
await page.fill("#passe_lama", "rahasia123");
await page.fill("#passe_baru", "passwordbaru99");
await page.fill("#passe_konfirmasi", "passwordbaru99");
await page.getByRole("button", { name: "Ganti Password" }).click();
await page.waitForURL(/saved=pw/, { timeout: 20000 });
assert(true, "redirect ?saved=pw setelah ganti password");
const loginBaru = await fetch(`${API}/loginuser`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ emaile: email, passe: "passwordbaru99" }),
}).then((r) => r.json());
assert(String(loginBaru.value) === "200", "login ulang dengan password baru sukses");

// ============== 8. Dropdown admin ==============
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const adminPage = await adminCtx.newPage();
const adminToken = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
await adminCtx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);
await adminPage.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await adminPage.click('button[aria-label="Menu profil"]');
await adminPage.waitForSelector('a:has-text("Profil")', { timeout: 10000 });
assert(true, "dropdown admin: link Profil tampil (semua level)");
await adminPage.click('a:has-text("Profil")');
await adminPage.waitForURL(/\/dashboard\/profil/, { timeout: 15000 });
await adminPage.waitForSelector("text=Data Diri", { timeout: 15000 });
assert(true, "halaman profil valid untuk sesi ADMIN");
await adminCtx.close();

// ============== Cleanup ==============
execSync(`rm -f ${LARAVEL_PUBLIC}/upload/profil/profil_${MEMBER_ID}_*`);
rows(`DELETE FROM pesan_notif WHERE idmember=${MEMBER_ID}`);
rows(`DELETE FROM data_basket WHERE id_member=${MEMBER_ID}`);
rows(`DELETE FROM confirmation WHERE idpengasuh=${MEMBER_ID}`);
rows(`DELETE FROM member WHERE id=${MEMBER_ID}`);
assert(
  rows(`SELECT COUNT(*) FROM member WHERE id=${MEMBER_ID}`)[0][0] === "0",
  "cleanup: member & file foto uji dihapus",
);

await browser.close();
console.log("\nSELESAI — semua asersi profil-check lulus ✅");
