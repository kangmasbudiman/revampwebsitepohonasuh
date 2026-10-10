// E2E alur adopsi penuh: daftar → adopsi → upload bukti → verifikasi admin
// → sertifikat → cancel. Jalankan dengan server web (:3000) dan Laravel
// (:8000) menyala. Node script ini TIDAK memodifikasi DB secara langsung —
// semua perubahan lewat UI web, DB hanya dibaca untuk assertion.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

// Pilih 2 pohon available secara dinamis (run sebelumnya meninggalkan status reserved).
const [TREE_MAIN, HARGA, TREE_CANCEL] = rows(
  "SELECT idpohon, harga FROM data_pohon WHERE adopted='available' ORDER BY id LIMIT 2",
).flatMap((r) => [r[0], Number(r[1])]);
if (!TREE_MAIN || !TREE_CANCEL) throw new Error("butuh 2 pohon available");

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};

const browser = await chromium.launch();

// ===== 1. Daftar akun baru =====
const email = `e2e_${Date.now()}@test.local`;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E Tester Web");
await page.fill("#email", email);
await page.fill("#phone", "081234567899");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
assert(true, `daftar → redirect /dashboard (email=${email})`);

const memberId = rows(
  `SELECT id FROM member WHERE emaile='${email}'`,
)[0][0];
assert(!!memberId, `member terbuat id=${memberId}`);

// ===== 2. Adopsi TREE_MAIN =====
await page.goto(`${BASE}/pohon/${TREE_MAIN}`, { waitUntil: "networkidle" });
await page.click("button:has-text('Adopsi Sekarang')");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
const confId = page.url().match(/\/dashboard\/adopsi\/(\d+)/)[1];
assert(true, `adopsi → /dashboard/adopsi/${confId} (invoice page)`);
await page.waitForSelector("text=Instruksi Pembayaran", { timeout: 15000 });

let [inv, price, conf] = rows(
  `SELECT invoice, price, confirmation FROM confirmation WHERE id=${confId}`,
)[0];
assert(conf === "no", `confirmation=${conf} (belum dibayar)`);
const uniq = Number(price) - HARGA;
assert(
  Number(price) === HARGA + uniq && uniq >= 100 && uniq <= 999,
  `price=${price} = ${HARGA} + kode unik ${uniq}`,
);
const basket = rows(
  `SELECT COUNT(*) FROM data_basket WHERE id_member='${memberId}'`,
)[0][0];
assert(Number(basket) === 0, `basket kosong setelah checkout (${basket} baris)`);
const adopted1 = rows(
  `SELECT adopted FROM data_pohon WHERE idpohon='${TREE_MAIN}'`,
)[0][0];
assert(adopted1 === "reserved", `${TREE_MAIN} reserved`);

// ===== 3. Upload bukti transfer =====
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
fs.writeFileSync("/tmp/e2e-bukti.png", png);
await page.setInputFiles("#proof", "/tmp/e2e-bukti.png");
await page.click("button:has-text('Kirim Bukti Pembayaran')");
await page.waitForSelector("text=Pembayaran Sedang Diverifikasi", { timeout: 30000 });
assert(true, "upload bukti → status Menunggu Verifikasi");
const foto = rows(`SELECT foto FROM confirmation WHERE id=${confId}`)[0][0];
assert(!!foto && foto !== "NULL", `confirmation.foto terisi (${foto})`);

// ===== 4. Verifikasi oleh admin =====
const adminToken = await new SignJWT({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await adminCtx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);
const adminPage = await adminCtx.newPage();
await adminPage.goto(`${BASE}/admin/verifikasi`, { waitUntil: "networkidle" });
await adminPage.click(`a[href="/admin/verifikasi/${confId}"]`);
await adminPage.waitForURL(/\/admin\/verifikasi\/\d+/, { timeout: 15000 });
await adminPage.waitForSelector("text=Bukti Transfer", { timeout: 15000 });
await adminPage.click("button:has-text('Verifikasi & Terbitkan Sertifikat')");
await adminPage.waitForURL(/verified=1/, { timeout: 30000 });
assert(true, "admin verifikasi → ?verified=1");

const conf2 = rows(`SELECT confirmation FROM confirmation WHERE id=${confId}`)[0][0];
assert(conf2 === "yes", `confirmation='yes'`);
const certnum = rows(
  `SELECT certnum FROM data_adopsi WHERE invoice='${inv}' AND certnum IS NOT NULL AND certnum != '' LIMIT 1`,
)[0]?.[0];
assert(!!certnum, `certnum terbit: ${certnum}`);
const adopted2 = rows(
  `SELECT adopted FROM data_pohon WHERE idpohon='${TREE_MAIN}'`,
)[0][0];
// Paritas mobile: pohon jadi 'adopted' saat tagging petugas, bukan saat
// verifikasi pembayaran — setelah verify tetap 'reserved'.
assert(adopted2 === "reserved", `${TREE_MAIN} tetap reserved sampai tagging petugas`);

// ===== 5. Dashboard donatur: aktif + sertifikat =====
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Adopsi Aktif", { timeout: 15000 });
const certLink = page.locator(`a[href^="/sertifikat/"]`).first();
await certLink.click();
await page.waitForURL(/\/sertifikat\//, { timeout: 30000 });
const holder = await page.textContent("h1");
assert(
  holder.includes("E2E Tester Web"),
  `sertifikat publik tampil atas nama "${holder.trim()}"`,
);

// ===== 6. Negatif: adopsi lalu batalkan =====
await page.goto(`${BASE}/pohon/${TREE_CANCEL}`, { waitUntil: "networkidle" });
await page.click("button:has-text('Adopsi Sekarang')");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
await page.waitForSelector("text=Instruksi Pembayaran", { timeout: 15000 });
await page.click("button:has-text('Batalkan Adopsi')");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
assert(true, "batalkan adopsi → kembali ke /dashboard");
const adopted3 = rows(
  `SELECT adopted FROM data_pohon WHERE idpohon='${TREE_CANCEL}'`,
)[0][0];
assert(adopted3 === "available", `${TREE_CANCEL} balik available setelah cancel`);

await browser.close();
console.log("\n=== SEMUA TAHAP E2E LULUS ===");
