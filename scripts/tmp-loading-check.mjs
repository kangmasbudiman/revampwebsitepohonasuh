import { chromium } from "playwright";
import { SignJWT } from "jose";
const BASE = "https://pohonasuh.io";
const secret = new TextEncoder().encode((process.env.PA_PROD_AUTH_SECRET ?? "").replace(/^"|"$/g, ""));
const token = (userId, name, level) =>
  new SignJWT({ userId, name, role: "ADMIN", level })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);
const assert = (cond, msg) => {
  if (!cond) { console.error("✗ GAGAL:", msg); process.exitCode = 1; }
  else console.log("✓", msg);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
try {
  // Pengelola: Kirim Pengajuan harus menampilkan spinner saat proses
  await ctx.addCookies([{ name: "pa_session", value: await token(2683, "P", 2), url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByPlaceholder("Cari kode / nama pohon…").fill("A168");
  await page.getByRole("checkbox", { name: "Pilih A168" }).check();
  await page.getByLabel("Alasan pengajuan").fill("uji animasi loading");
  await page.waitForTimeout(2000);
  const kirim = page.getByRole("button", { name: /Kirim Pengajuan/i });
  await kirim.click();
  // sesaat setelah klik: tombol disabled + label pending
  const spinner = page.locator("button[aria-busy='true']");
  await spinner.waitFor({ timeout: 5000 });
  assert(await spinner.isDisabled(), "kirim: tombol disabled saat proses");
  assert(
    (await spinner.innerText()).includes("Mengirim pengajuan…"),
    "kirim: label 'Mengirim pengajuan…' tampil",
  );
  await page.waitForURL(/diaju=1/, { timeout: 30000 });
  await page.getByRole("button", { name: "Selesai" }).click();

  // Admin: modal Konfirmasi Pembekuan tetap terbuka + spinner, tutup otomatis setelah redirect
  await ctx.clearCookies();
  await ctx.addCookies([{ name: "pa_session", value: await token(1, "A", 1), url: BASE }]);
  const admin = await ctx.newPage();
  await admin.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await admin.waitForTimeout(2000);
  await admin.getByPlaceholder("Cari kode / nama pohon…").fill("A168");
  await admin.getByRole("checkbox", { name: "Pilih A168" }).first().check();
  await admin.getByLabel("Alasan pembekuan").fill("uji animasi loading");
  await admin.getByLabel("Berlaku").selectOption("7");
  await admin.getByRole("button", { name: /Konfirmasi Pembekuan/i }).click();
  const busy = admin.locator("button[aria-busy='true']");
  await busy.waitFor({ timeout: 5000 });
  assert(
    (await busy.innerText()).includes("Membekukan…"),
    "modal: label 'Membekukan…' tampil saat proses",
  );
  // modal tetap terbuka selama proses (dialog masih ada)
  assert(await admin.getByRole("dialog").isVisible(), "modal: masih terbuka selama proses");
  await admin.waitForURL(/beku=1/, { timeout: 30000 });
  assert(!(await admin.getByRole("dialog").count()), "modal: tertutup otomatis setelah selesai");
  await admin.getByRole("button", { name: "Selesai" }).click();

  // pulihkan A168 via tombol Buka Pembekuan (cek spinner juga)
  await admin.getByLabel("Cari pohon dibekukan").fill("A168");
  await admin.locator("tbody tr", { hasText: "uji animasi loading" }).first()
    .getByRole("button", { name: "Buka Pembekuan" }).click();
  await admin.waitForURL(/beku=0/, { timeout: 30000 });
  await admin.getByRole("button", { name: "Selesai" }).click();
  assert(!(await admin.getByRole("dialog").count()), "pemulihan: A168 dibuka kembali");
} finally {
  await browser.close();
}
