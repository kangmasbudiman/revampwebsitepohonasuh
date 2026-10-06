// Smoke test produksi: unduh massal papan taging di pohonasuh.io.
// Murni sisi klien (checkbox → ZIP PNG) — TIDAK ada mutasi DB produksi.
import { chromium } from "playwright";
import fs from "node:fs";
import JSZip from "jszip";

const assert = (c, m) => {
  if (!c) { console.error("GAGAL:", m); process.exit(1); }
  console.log("OK", m);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("https://pohonasuh.io/masuk");
await page.fill("#email", "petugastes2026@yahoo.com");
await page.fill("#password", "Petugas1234");
await page.click("button[type=submit]");
await page.waitForURL(/\/admin/, { timeout: 30000 });
assert(true, "login petugas → " + page.url());

await page.goto("https://pohonasuh.io/admin/tagging", { waitUntil: "networkidle" });
const cek = page.locator('label:has(input[aria-label^="Tandai papan"])');
await cek.first().waitFor({ timeout: 30000 });
const jumlah = await cek.count();
assert(jumlah >= 2, `halaman memuat ${jumlah} kartu ber-checkbox Papan`);

// Conteng 2 kartu pertama → bar aksi
await cek.nth(0).click();
await cek.nth(1).click();
const bar = page.getByTestId("unduh-papan-batch");
await bar.waitFor({ timeout: 10000 });
assert((await bar.textContent()).includes("Download Papan Taging (2)"), "tombol Download Papan Taging (2) tampil");

// Download → ZIP berisi 2 PNG resolusi cetak
const zipPath = "/tmp/vps-papan-batch.zip";
try { fs.unlinkSync(zipPath); } catch {}
const waitDl = page.waitForEvent("download", { timeout: 120000 });
await bar.click();
const dl = await waitDl;
await dl.saveAs(zipPath);
const nama = await dl.suggestedFilename();
assert(/^papan-taging-\d{4}-\d{2}-\d{2}\.zip$/.test(nama), `file terunduh: ${nama}`);

const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
const entries = Object.values(zip.files).filter((f) => !f.dir);
assert(entries.length === 2, `ZIP berisi 2 PNG (nyata: ${entries.length})`);
for (const f of entries) {
  assert(/^papan-[A-Z]\d+-\d+\.png$/.test(f.name), `nama file: ${f.name}`);
  const buf = await f.async("nodebuffer");
  assert(buf.length > 100_000, `${f.name} berukuran wajar (${(buf.length / 1024).toFixed(0)} KB)`);
  assert(buf[0] === 0x89 && buf[1] === 0x50, `${f.name} magic PNG benar`);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  assert(w === 2382 && h === 1684, `${f.name} dimensi cetak 2382×1684 (nyata ${w}×${h})`);
}

await page.getByRole("button", { name: "Kosongkan pilihan papan" }).click();
await page.waitForTimeout(300);
assert((await page.getByTestId("unduh-papan-batch").count()) === 0, "Kosongkan → bar menghilang");

await page.screenshot({ path: "/tmp/uji-vps-papan-batch.png", fullPage: false });
await browser.close();
if (!process.env.KEEP_ZIP) {
  try { fs.unlinkSync(zipPath); } catch {}
}
console.log("\n=== SMOKE TEST UNDUH MASSAL PAPAN TAGING PRODUKSI LULUS ===");
