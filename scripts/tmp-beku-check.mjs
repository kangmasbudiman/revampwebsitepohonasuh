// Uji sementara UI menu Pembekuan Pohon di produksi. Dihapus setelah uji.
import { chromium } from "playwright";
import { SignJWT } from "jose";

const BASE = "https://pohonasuh.io";
const secret = new TextEncoder().encode((process.env.PA_PROD_AUTH_SECRET ?? "").replace(/^"|"$/g, ""));
const token = await new SignJWT({ userId: 1, name: "Askarinta Adi", role: "ADMIN", level: 1 })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exitCode = 1;
  } else console.log("✓", msg);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

const tutupPopup = async () => {
  const btn = page.getByRole("button", { name: "Selesai" });
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(500);
  }
};

try {
  await page.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
  assert((await page.getByRole("heading", { name: "Pembekuan Pohon" }).count()) === 1, "halaman Pembekuan Pohon terbuka");

  // Sidebar memuat menu Pembekuan Pohon
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const groupBtns = page.locator("aside button[aria-expanded]");
  for (let i = 0; i < (await groupBtns.count()); i++) {
    if ((await groupBtns.nth(i).getAttribute("aria-expanded")) === "false") await groupBtns.nth(i).click();
  }
  assert(
    (await page.locator("aside nav a", { hasText: "Pembekuan Pohon" }).count()) === 1,
    "menu sidebar Pembekuan Pohon ada",
  );

  await page.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });

  // ---- Mode pohon: A168, alasan, sementara 7 hari ----
  await page.getByPlaceholder("Cari kode / nama pohon…").fill("A168");
  await page.getByRole("checkbox", { name: /A168/ }).first().check();
  await page.getByLabel("Alasan pembekuan").fill("Uji UI sementara");
  await page.getByLabel("Berlaku").selectOption("7");
  await page.getByRole("button", { name: /Konfirmasi Pembekuan/i }).click();
  await page.waitForURL(/beku=1/, { timeout: 30000 });
  await tutupPopup();
  const baris = page.locator("tbody tr", { hasText: "A168" }).first();
  await baris.waitFor();
  const teks = await baris.innerText();
  assert(teks.includes("Uji UI sementara"), "alasan tampil di tabel");
  assert(/s\.d\.|Berlaku s\.d\./.test(teks) || teks.includes("2026-"), "batas waktu tampil");

  // Publik: label Pohon Sedang Dibekukan
  const pub = await (await ctx.request.get(`${BASE}/pohon/A168`)).text();
  assert(pub.includes("Pohon Sedang Dibekukan"), "label publik Pohon Sedang Dibekukan");
  assert(pub.includes("belum bisa diadopsi"), "keterangan belum bisa diadopsi");

  // ---- Mode desa: seluruh pohon tersedia simancuang ----
  await page.getByRole("radio", { name: /Seluruh pohon tersedia di satu desa/i }).click();
  await page.getByLabel("Lokasi desa").selectOption("simancuang");
  await page.getByLabel("Alasan pembekuan").fill("Uji UI desa");
  await page.getByRole("button", { name: /Konfirmasi Pembekuan/i }).click();
  await page.waitForURL(/beku=1/, { timeout: 30000 });
  await tutupPopup();
  assert((await page.locator("tbody tr").count()) > 20, "pohon desa masuk tabel dibekukan");

  // ---- Buka semua pembekuan (pilih semua) ----
  await page.getByLabel("Pilih semua pohon dibekukan").check();
  await page.getByRole("button", { name: /Buka Pembekuan \(/i }).click();
  await page.waitForURL(/beku=0/, { timeout: 30000 });
  await tutupPopup();
  const sisaa = await page.locator("tbody tr", { hasText: "A168" }).count();
  const sisab = await page.locator("tbody tr", { hasText: "A1" }).count();
  assert(sisaa === 0, "A168 terbuka");
  assert(sisab === 0, "pohon simancuang terbuka");

  // Publik kembali normal
  const pub2 = await (await ctx.request.get(`${BASE}/pohon/A168`)).text();
  assert(!pub2.includes(">Pohon Sedang Dibekukan<"), "badge beku hilang dari publik");
} finally {
  await browser.close();
}
