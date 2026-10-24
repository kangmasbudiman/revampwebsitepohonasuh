// E2E Kelola User: buat akun petugas lewat form Tambah Akun, ubah peran
// akun existing. Data uji dihapus langsung dari DB dev di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
const EMAIL_UJI = "uji-e2e@tes.id";
const NAMA_UJI = "Petugas Uji E2E";
const assert = (c, m) => {
  if (!c) {
    console.error("✗ GAGAL:", m);
    process.exit(1);
  }
  console.log("✓", m);
};
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const signToken = (p) =>
  new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

// Buang sisa data uji run sebelumnya agar skrip idempoten
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM member WHERE emaile='${EMAIL_UJI}'" 2>/dev/null`,
);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([
  { name: "pa_session", value: await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE },
]);
const page = await ctx.newPage();

// ================= 1. Form Tambah Akun =================
await page.goto(`${BASE}/admin/user`, { waitUntil: "networkidle" });
await assert((await page.getByRole("link", { name: "Tambah Akun" }).count()) === 1, "tombol Tambah Akun tampil");
await page.getByRole("link", { name: "Tambah Akun" }).click();
await page.locator("h2", { hasText: "Tambah Akun" }).waitFor();
assert(true, "form tambah akun terbuka");

await page.fill("input[name=name]", NAMA_UJI);
await page.fill("input[name=emaile]", EMAIL_UJI);
await page.fill("input[name=hp]", "0812999");
await page.fill("input[name=passe]", "rahasia1");
// peran default = Petugas (value 2)
const formTambah = page.locator("form").filter({ has: page.locator("input[name='passe']") });
const peranAwal = await formTambah.locator("select[name='admin']").inputValue();
assert(peranAwal === "2", `default peran = Petugas (${peranAwal})`);
await page.getByRole("button", { name: "Buat Akun" }).click();

await page.waitForSelector("text=Akun Dibuat");
assert(await page.getByText(`Akun ${NAMA_UJI} dibuat`).isVisible(), "popup 'Akun Dibuat' muncul");
await page.keyboard.press("Escape"); // tutup overlay agar tabel bisa diklik

// ================= 2. Akun baru tampil sebagai Petugas =================
await page.fill("input[placeholder^='Cari nama']", NAMA_UJI);
const baris = page.locator("tbody tr", { hasText: NAMA_UJI });
await baris.waitFor();
assert(await baris.locator("text=Petugas").first().isVisible(), "baris uji tampil berperan Petugas");

// ================= 3. Akun baru bisa login sebagai petugas =================
const login = JSON.parse(
  execSync(
    `curl -s -X POST http://localhost:8001/api/loginuser -H "Accept: application/json" -d "emaile=${EMAIL_UJI}&passe=rahasia1"`,
  ).toString(),
);
assert(login.value === "200" && Number(login.admin) === 2, `loginuser akun uji → 200, admin=2 (${JSON.stringify(login)})`);

// ================= 4. Ubah peran jadi Donatur =================
const selectPeran = baris.locator("select[name=admin]");
assert((await selectPeran.inputValue()) === "2", "select peran baris uji = Petugas");
await selectPeran.selectOption("0");
await baris.getByRole("button", { name: "Simpan" }).click();
await page.locator("button[data-confirm-submit]").click(); // konfirmasi modal
await page.waitForSelector("text=Tersimpan");
assert(
  await page.getByText(`Peran ${NAMA_UJI} diubah menjadi Donatur`).isVisible(),
  "popup peran berubah jadi Donatur",
);
await page.keyboard.press("Escape");
await page.fill("input[placeholder^='Cari nama']", NAMA_UJI);
await page.locator("tbody tr", { hasText: NAMA_UJI }).waitFor();
assert(
  (await page.locator("tbody tr", { hasText: NAMA_UJI }).locator("select[name=admin]").inputValue()) === "0",
  "baris uji kini Donatur",
);

// ================= 5. Cleanup =================
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "DELETE FROM member WHERE emaile='${EMAIL_UJI}'" 2>/dev/null`,
);
const sisa = execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -N -e "SELECT COUNT(*) FROM member WHERE emaile='${EMAIL_UJI}'" 2>/dev/null`,
).toString().trim();
assert(sisa === "0", "data uji dibersihkan dari DB");

await browser.close();
console.log("SELESAI");
