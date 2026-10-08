// Smoke test PRODUKSI (pohonasuh.io) untuk filter desa Order Tagging:
// admin level 1 melihat dropdown filter desa (endpoint `semua`), petugas
// level 2 tetap tanpa dropdown. Tanpa fixture — murni verifikasi deploy.
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const API = "https://rest.pohonasuh.io/api";
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

// ============== 1. API: param `semua` aktif di produksi ==============
const [semua, tanpa] = await Promise.all([
  fetch(`${API}/ordercustomerbypengurus`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "iduser=2682&semua=1",
  }).then((r) => r.json()),
  fetch(`${API}/ordercustomerbypengurus`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "iduser=2682",
  }).then((r) => r.json()),
]);
ok(Array.isArray(semua) && Array.isArray(tanpa), `API merespons (semua=${semua.length}, tanpa=${tanpa.length})`);
const desaSemua = [...new Set(semua.map((r) => r.desa).filter(Boolean))].sort();
const desaTanpa = [...new Set(tanpa.map((r) => r.desa).filter(Boolean))].sort();
ok(
  desaSemua.length >= desaTanpa.length && desaTanpa.every((d) => desaSemua.includes(d)),
  `cakupan desa 'semua' ⊇ tanpa (${desaSemua.join(", ")})`,
);

// ============== 2. UI admin: dropdown filter desa ==============
const browser = await chromium.launch();
const login = async (email, pass) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  await p.goto(`${BASE}/masuk?next=%2Fadmin%2Ftagging`, { waitUntil: "networkidle" });
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', pass);
  await p.click("button[type=submit]");
  await p.waitForURL("**/admin/tagging");
  await p.getByRole("heading", { name: "Order Tagging", exact: true }).waitFor();
  return [ctx, p];
};

const [aCtx, a] = await login("admintes2026@yahoo.com", "Admin123!");
const sel = a.locator('select[aria-label="Filter desa"]');
await sel.waitFor({ timeout: 15000 });
const options = await sel.locator("option").allTextContents();
ok(options[0] === "Semua desa", "admin: dropdown filter desa tampil (default Semua desa)");
ok(
  options.slice(1).join(",") === desaSemua.join(","),
  `opsi desa sinkron API (${options.length - 1} desa)`,
);
ok((await a.getByText("daftar ini mencakup order dari semua desa", { exact: false }).count()) >= 1, "admin: catatan cakupan semua desa tampil");

// pilih desa pertama non-default → URL berubah, daftar menyempit
const desaPertama = options[1];
await sel.selectOption(desaPertama);
await a.waitForURL(`**/admin/tagging?desa=${encodeURIComponent(desaPertama)}`);
await a.waitForTimeout(1000);
const invoices = await a.locator("main .rounded-2xl").allInnerTexts();
const tampil = invoices.length;
const apiDesa = semua.filter((r) => r.desa === desaPertama && r.confirmasi === "yes").length;
ok(tampil === apiDesa, `filter ${desaPertama}: ${tampil} kartu = API (${apiDesa})`);
await aCtx.close();

// ============== 3. UI petugas: tanpa dropdown ==============
const [pCtx, p] = await login("petugastes2026@yahoo.com", "Petugas1234");
ok((await p.locator('select[aria-label="Filter desa"]').count()) === 0, "petugas: dropdown filter desa TIDAK muncul");
ok((await p.getByText("daftar ini mencakup order dari semua desa", { exact: false }).count()) === 0, "petugas: tanpa catatan semua desa");
await pCtx.close();
await browser.close();

if (process.exitCode) {
  console.error("\n=== ADA ASERSI GAGAL ===");
} else {
  console.log("\n=== SMOKE PRODUKSI FILTER DESA ORDER TAGGING LULUS ===");
}
