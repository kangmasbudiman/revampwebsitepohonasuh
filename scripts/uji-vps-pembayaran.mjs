// Smoke test PRODUKSI (pohonasuh.io) untuk Pencatatan Keuangan:
// halaman /admin/keuangan/pembayaran — daftar pohon sudah-ditagging sinkron
// dengan Order Tagging, catat pembayaran via modal (penerima prefill petugas
// desa), lalu hapus lagi agar tidak menyisakan debris di DB prod.
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const ok = (c, m) => {
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
const one = (q) => rows(q)[0]?.[0] ?? "";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(30000);

// ============== 1. Login admin → halaman pembayaran ==============
await page.goto(`${BASE}/masuk?next=%2Fadmin%2Fkeuangan%2Fpembayaran`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admintes2026@yahoo.com");
await page.fill('input[name="password"]', "Admin123!");
await page.click("button[type=submit]");
await page.waitForURL("**/admin/keuangan/pembayaran");
await page.getByRole("heading", { name: "Pencatatan Keuangan", exact: true }).waitFor();
ok(true, "login admin produksi → /admin/keuangan/pembayaran");

// ============== 2. KPI sinkron dengan DB ==============
const belumDb = one(
  `SELECT COUNT(*) FROM data_adopsi a JOIN confirmation c ON c.invoice=a.invoice LEFT JOIN pembayaran_tagging pt ON pt.idadopsi=a.id WHERE c.confirmation='yes' AND (a.proses=3 OR EXISTS(SELECT 1 FROM foto_tagging f WHERE f.idadopsi=a.id)) AND pt.id IS NULL`,
);
const body = await page.locator("main").innerText();
ok(new RegExp(`${Number(belumDb).toLocaleString("id-ID")} pohon`).test(body), `KPI "Belum dibayar" = ${belumDb} pohon (sinkron DB)`);

// ============== 3. Link dari Kelola Keuangan ==============
await page.goto(`${BASE}/admin/keuangan`, { waitUntil: "networkidle" });
ok((await page.locator('a[href="/admin/keuangan/pembayaran"]').count()) === 1, "kartu link di Kelola Keuangan");

// ============== 4. Catat pembayaran pada baris pertama yang belum dibayar ==============
await page.goto(`${BASE}/admin/keuangan/pembayaran`, { waitUntil: "networkidle" });
const btn = page.locator('button[aria-label^="Catat pembayaran"]').first();
await btn.waitFor();
const idadopsi = Number(await page.locator("tbody tr[data-idadopsi]").first().getAttribute("data-idadopsi"));
const petugas = one(
  `SELECT GROUP_CONCAT(m.name SEPARATOR ', ') FROM data_adopsi a JOIN desa d ON d.nama=a.desa JOIN desa_petugas dp ON dp.iddesa=d.id JOIN member m ON m.id=dp.idpetugas WHERE a.id=${idadopsi}`,
);
await btn.click();
const dlg = page.locator('[role="dialog"][aria-label="Catat pembayaran"]');
await dlg.waitFor();
const penerimaVal = await dlg.locator('input[name="penerima"]').inputValue();
ok(penerimaVal !== "" && penerimaVal === petugas, `penerima ter-prefill petugas desa prod ("${penerimaVal}")`);
await dlg.getByRole("button", { name: "Simpan Pembayaran" }).click();
await dlg.getByText("Pembayaran tersimpan.").waitFor();
await page.locator('[role="dialog"]').waitFor({ state: "detached" });
const dbRow = one(`SELECT CONCAT('[',IFNULL(penerima,''),']') FROM pembayaran_tagging WHERE idadopsi=${idadopsi}`);
ok(dbRow !== "" && dbRow !== "[]", `pembayaran tersimpan di DB prod (idadopsi ${idadopsi})`);

// ============== 5. Edit jumlah lalu hapus (bersih) ==============
await page.locator(`button[aria-label^="Edit pembayaran"]`).first().click();
const dlgE = page.locator('[role="dialog"][aria-label="Edit pembayaran"]');
await dlgE.waitFor();
await dlgE.locator('input[name="jumlah"]').fill("150000");
await dlgE.getByRole("button", { name: "Simpan Pembayaran" }).click();
await dlgE.locator('[role="dialog"]').waitFor({ state: "detached" }).catch(() => {});
await page.waitForTimeout(1500);
ok(one(`SELECT jumlah FROM pembayaran_tagging WHERE idadopsi=${idadopsi}`) === "150000", "edit jumlah → 150000 di DB prod");

await page.locator(`tbody tr[data-idadopsi="${idadopsi}"] button:has-text("Hapus")`).click();
await page.getByRole("dialog").getByRole("button", { name: "Ya, Lanjutkan" }).click();
await page.waitForURL("**/admin/keuangan/pembayaran?deleted=1");
ok(one(`SELECT COUNT(*) FROM pembayaran_tagging WHERE idadopsi=${idadopsi}`) === "0", "hapus pembayaran → DB prod bersih kembali");

await browser.close();
console.log("\n=== SMOKE PRODUKSI PENCATATAN KEUANGAN SELESAI ===");
