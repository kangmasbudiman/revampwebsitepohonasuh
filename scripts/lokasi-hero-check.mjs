// Probe responsif kartu lokasi ber-foto: mobile stacked, desktop foto kiri.
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const browser = await chromium.launch();

for (const vp of [
  { w: 390, h: 844, nama: "mobile 390" },
  { w: 768, h: 1024, nama: "tablet 768" },
  { w: 1440, h: 900, nama: "desktop 1440" },
]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const cards = page.locator("main > div > div");
  const n = await cards.count();
  ok(`${vp.nama}: semua kartu tampil`, n === 19, `${n} kartu`);

  const card = cards.nth(0);
  const foto = card.locator("a img").first();
  await foto.waitFor({ timeout: 15000 });
  const loaded = await foto.evaluate((el) => el.complete && el.naturalWidth > 0);
  ok(`${vp.nama}: foto termuat (naturalWidth>0)`, loaded);

  const fb = await foto.boundingBox();
  const tb = await card.locator("h2").first().boundingBox();
  const cb = await card.boundingBox();
  ok(`${vp.nama}: kartu tinggi wajar`, cb.height > 120 && cb.height < 700, `${Math.round(cb.height)}px`);

  if (vp.w < 640) {
    ok(`${vp.nama}: mobile foto di ATAS konten (stacked)`, fb.y < tb.y, `foto y=${Math.round(fb.y)} judul y=${Math.round(tb.y)}`);
    ok(`${vp.nama}: mobile foto full-width kartu`, Math.abs(fb.x - cb.x) < 2 && fb.width > cb.width - 4, `w=${Math.round(fb.width)}`);
  } else {
    ok(`${vp.nama}: foto di KIRI konten (side by side)`, fb.x < tb.x && fb.y >= cb.y - 2, `foto x=${Math.round(fb.x)} judul x=${Math.round(tb.x)}`);
    ok(`${vp.nama}: foto tinggi penuh kartu (stretch)`, fb.y <= cb.y + 2 && fb.y + fb.height >= cb.y + cb.height - 2, `foto ${Math.round(fb.height)}px vs kartu ${Math.round(cb.height)}px`);
    ok(`${vp.nama}: lebar foto sesuai breakpoint`, Math.abs(fb.width - 256) < 4 || Math.abs(fb.width - 288) < 4, `w=${Math.round(fb.width)}`);
  }

  // kontrak lama: link detail + judul
  ok(`${vp.nama}: link judul & detail lokasi tetap ada`,
    (await card.locator('a[href^="/lokasi/"]').count()) >= 2);
  await page.screenshot({ path: `/tmp/lokasi-${vp.w}.png` });
  await page.close();
}

// pasiahlaweh (0 pohon) → fallback lokal
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/lokasi`, { waitUntil: "networkidle" });
  const cardPl = page.locator("main > div > div", { hasText: "Pasiahlaweh" });
  const src = await cardPl.locator("a img").first().getAttribute("src");
  ok("pasiahlaweh: pakai fallback lokal", (src ?? "").includes("Lokasi-Pohon-Asuh-2023") || (src ?? "").includes("_next"),
    (src ?? "").slice(0, 80));
  await page.close();
}

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
