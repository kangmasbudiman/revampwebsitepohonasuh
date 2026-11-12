// Uji sementara alur pengajuan pembekuan (pengelola → admin utama).
// Dihapus setelah uji. Jalankan dengan PA_PROD_AUTH_SECRET di env.
import { chromium } from "playwright";
import { SignJWT } from "jose";

const BASE = "https://pohonasuh.io";
const secret = new TextEncoder().encode(
  (process.env.PA_PROD_AUTH_SECRET ?? "").replace(/^"|"$/g, ""),
);
const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exitCode = 1;
  } else console.log("✓", msg);
};
const token = (userId, name, level) =>
  new SignJWT({ userId, name, role: "ADMIN", level })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const tutupPopup = async (page) => {
  const btn = page.getByRole("button", { name: "Selesai" });
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(400);
  }
};

try {
  // ============ Peran pengelola desa (userId 2683, level 2) ============
  await ctx.addCookies([
    { name: "pa_session", value: await token(2683, "Petugas Taging Rantaukremas", 2), url: BASE },
  ]);
  const pengelola = await ctx.newPage();

  await pengelola.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
  assert(
    (await pengelola.locator("h1", { hasText: "Pembekuan Pohon" }).count()) === 1,
    "pengelola: halaman terbuka",
  );
  assert(
    (await pengelola.locator("h2", { hasText: "Ajukan Pembekuan Pohon" }).count()) === 1,
    "pengelola: form pengajuan tampil",
  );

  // Ajukan pohon A168 (rantaukermas), alasan, 30 hari
  await pengelola.getByPlaceholder("Cari kode / nama pohon…").fill("A168");
  await pengelola.getByRole("checkbox", { name: "Pilih A168" }).check();
  await pengelola.getByLabel("Alasan pengajuan").fill("uji UI pengelola v2");
  await pengelola.getByLabel("Berlaku").selectOption("30");
  await pengelola.getByRole("button", { name: /Kirim Pengajuan/i }).click();
  await pengelola.waitForURL(/diaju=1/, { timeout: 30000 });
  await tutupPopup(pengelola);
  await pengelola.waitForTimeout(800);
  const barisP = pengelola.locator("tbody tr", { hasText: "uji UI pengelola v2" }).first();
  assert(
    (await barisP.innerText()).includes("Menunggu persetujuan"),
    "pengelola: riwayat menunjukkan Menunggu persetujuan",
  );

  // ============ Peran admin utama (userId 1, level 1) ============
  await ctx.clearCookies();
  await ctx.addCookies([
    { name: "pa_session", value: await token(1, "Askarinta Adi", 1), url: BASE },
  ]);
  const admin = await ctx.newPage();
  await admin.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
  assert(
    (await admin.locator("tbody tr", { hasText: "uji UI pengelola v2" })
      .getByRole("button", { name: "Setujui" }).count()) === 1,
    "admin: tombol Setujui tersedia",
  );

  await admin.locator("tbody tr", { hasText: "uji UI pengelola v2" }).first()
    .getByRole("button", { name: "Setujui" }).click();
  await admin.waitForURL(/acc=1/, { timeout: 30000 });
  await tutupPopup(admin);
  await admin.waitForTimeout(800);
  const barisA = admin.locator("tbody tr", { hasText: "uji UI pengelola v2" }).first();
  assert(
    (await barisA.innerText()).includes("Disetujui"),
    "admin: pengajuan berstatus Disetujui",
  );

  // Frozen table: cari A168 lewat pencarian tabel
  await admin.getByLabel("Cari pohon dibekukan").fill("A168");
  await admin.waitForTimeout(500);
  assert(
    (await admin.locator("tbody tr", { hasText: "uji UI pengelola v2" }).count()) === 1,
    "admin: A168 masuk daftar Pohon Sedang Dibekukan",
  );

  const pub = await (await ctx.request.get(`${BASE}/pohon/A168`)).text();
  assert(pub.includes("Pohon Sedang Dibekukan"), "publik: label Pohon Sedang Dibekukan tampil");

  // ============ Tolak pengajuan (alur tolak + catatan) ============
  await ctx.clearCookies();
  await ctx.addCookies([
    { name: "pa_session", value: await token(2683, "Petugas Taging Rantaukremas", 2), url: BASE },
  ]);
  await pengelola.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
  await pengelola.getByRole("radio", { name: /Seluruh pohon tersedia di desa saya/i }).click();
  await pengelola.getByLabel("Alasan pengajuan").fill("uji tolak pengelola v2");
  await pengelola.getByRole("button", { name: /Kirim Pengajuan/i }).click();
  await pengelola.waitForURL(/diaju=1/, { timeout: 30000 });
  await tutupPopup(pengelola);

  await ctx.clearCookies();
  await ctx.addCookies([
    { name: "pa_session", value: await token(1, "Askarinta Adi", 1), url: BASE },
  ]);
  await admin.goto(`${BASE}/admin/pohon/beku`, { waitUntil: "networkidle" });
  await admin.locator("tbody tr", { hasText: "uji tolak pengelola v2" }).first()
    .getByRole("button", { name: "Tolak" }).click();
  await admin.getByLabel("Catatan untuk pengaju (opsional)").fill("mohon tunggu verifikasi lapangan");
  await admin.getByRole("button", { name: /Tolak Pengajuan/i }).click();
  await admin.waitForURL(/tolak=1/, { timeout: 30000 });
  await tutupPopup(admin);
  await admin.waitForTimeout(800);
  assert(
    (await admin.locator("tbody tr", { hasText: "uji tolak pengelola v2" }).first().innerText())
      .includes("Ditolak"),
    "admin: pengajuan berstatus Ditolak",
  );

  // ============ Pulihkan: buka pembekuan A168 ============
  await admin.locator("tbody tr", { hasText: "uji UI pengelola v2" })
    .getByRole("button", { name: "Buka Pembekuan" }).click();
  await admin.waitForURL(/beku=0/, { timeout: 30000 });
  await tutupPopup(admin);
  const pub2 = await (await ctx.request.get(`${BASE}/pohon/A168`)).text();
  assert(!pub2.includes(">Pohon Sedang Dibekukan<"), "pemulihan: badge beku A168 hilang dari publik");
} finally {
  await browser.close();
}
