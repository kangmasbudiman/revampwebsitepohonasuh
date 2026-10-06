// Verifikasi produksi: blok "Adopted Trees" di sertifikat + tonase di
// halaman detail pohon (fitur tonase per batang, revisi 2026-10-05).
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "https://pohonasuh.io";
const API = "https://rest.pohonasuh.io/api";
const assert = (c, m) => {
  if (!c) { console.error("✗ GAGAL:", m); process.exit(1); }
  console.log("✓", m);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const enc = (c) => c.split("/").map(encodeURIComponent).join("/");

async function bukaSertifikat(kode) {
  await page.goto(`${BASE}/sertifikat/${enc(kode)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const sheet = document.querySelector(".pa-sertifikat");
    if (!sheet) return null;
    const r = sheet.getBoundingClientRect();
    const blok = [...sheet.querySelectorAll("div")].find((d) =>
      d.textContent.trim().startsWith("Adopted Trees") && d.querySelector("ul"),
    );
    let blokPos = null;
    if (blok) {
      const b = blok.getBoundingClientRect();
      blokPos = {
        top: ((b.top - r.top) / r.height) * 100,
        left: ((b.left - r.left) / r.width) * 100,
        right: ((b.right - r.left) / r.width) * 100,
        bottom: ((b.bottom - r.top) / r.height) * 100,
      };
    }
    return {
      imgOK: [...sheet.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0),
      adaBlok: !!blok,
      header: blok?.querySelector("p")?.textContent ?? null,
      baris: blok ? [...blok.querySelectorAll("li")].map((li) => li.textContent) : [],
      blokPos,
    };
  });
}

// ---- Kasus 1: 1 pohon (008/LPHD-RTK/2026 → D101) ----
let d = await bukaSertifikat("008/LPHD-RTK/2026");
assert(d, "lembar sertifikat termuat");
assert(d.imgOK, "background template termuat");
assert(d.adaBlok && d.header === "Adopted Trees", `header blok (${d.header})`);
assert(
  d.baris[0] === "D101 · Kayu Nulad (Lithocarpus palembanica) · Ø 130 cm · ± 14.7 tons",
  `baris 1 pohon: "${d.baris[0]}"`,
);
assert(
  Math.abs(d.blokPos.left - 23.91) < 2 && d.blokPos.top > 74 && d.blokPos.bottom < 99,
  `posisi blok dalam zona aman kiri-bawah (${JSON.stringify(d.blokPos)})`,
);

// ---- Kasus 2: 5 pohon per-batang (072/KPHD-RK/2018) ----
d = await bukaSertifikat("072/KPHD-RK/2018");
assert(d.baris.length === 5, `5 baris per batang (${d.baris.length})`);
assert(d.baris[0] === "A049 · Kayu Nulad (Lithocarpus palembanica) · Ø 103 cm · ± 8.2 tons", `baris 1: "${d.baris[0]}"`);
assert(d.baris[3] === "C068 · Kapas · Ø 105 cm · ± 8.6 tons", `species kosong → label lokal saja: "${d.baris[3]}"`);

// ---- Kasus 3: 6 pohon diringkas per spesies (071/LPHD-LN/2022) ----
d = await bukaSertifikat("071/LPHD-LN/2022");
assert(d.baris.length === 5, `4 grup + total = 5 baris (${d.baris.length}: ${JSON.stringify(d.baris)})`);
assert(d.baris.includes("2 × Gelam (Syzygium attenuatum) · Ø 66–76 cm"), `grup diameter range: ${d.baris[1]}`);
assert(
  d.baris[4] === "Total 6 trees · ± 28.6 tons estimated biomass",
  `baris total: "${d.baris[4]}"`,
);

// ---- Kasus 4: 66 pohon → satu baris ringkas (058/LPHN-SR/2022) ----
d = await bukaSertifikat("058/LPHN-SR/2022");
assert(
  d.baris.length === 1 && d.baris[0] === "66 trees · 11 species · Ø 40–50 cm · ± 59.5 tons",
  `ringkasan order besar: "${d.baris[0]}"`,
);

// ---- Kasus 5: sertifikat lama tanpa data pohon (008/LPHD-RTK/2016) ----
d = await bukaSertifikat("008/LPHD-RTK/2016");
if (d) {
  assert(!d.adaBlok, "pohon_list kosong → blok tidak dirender");
} else {
  console.log("✓ sertifikat 2016 → not-found (pohon/desa hilang) — blok tidak ada");
}

// ---- Kasus 6: tonase di halaman detail pohon (A106) ----
const api = JSON.parse(
  await (await fetch(`${API}/pohonbykode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idpohon: "A106" }),
  })).text(),
);
assert(api.tonase !== undefined, `API pohonbykode mengirim tonase (${api.tonase})`);
await page.goto(`${BASE}/pohon/A106`, { waitUntil: "networkidle" });
const detail = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("dt")].map((dt) => ({
    label: dt.textContent,
    value: dt.nextElementSibling?.textContent ?? "",
  }));
  return cards;
});
const t = detail.find((c) => c.label === "Estimasi Biomassa");
assert(t && t.value === `± ${Number(api.tonase).toLocaleString("id-ID", { maximumFractionDigits: 1 })} ton`, `kartu Estimasi Biomassa (${JSON.stringify(t)})`);
assert(detail.some((c) => c.label === "Diameter"), "kartu Diameter tetap ada");

await page.goto(`${BASE}/sertifikat/${enc("071/LPHD-LN/2022")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/cert-071-baru.png", fullPage: true });
await page.goto(`${BASE}/sertifikat/${enc("008/LPHD-RTK/2026")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/cert-008-baru.png", fullPage: true });
await page.goto(`${BASE}/sertifikat/${enc("058/LPHN-SR/2022")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/cert-058-baru.png", fullPage: true });

await browser.close();
console.log("\n=== VERIFIKASI PRODUKSI TONASE + BLOK SERTIFIKAT LULUS ===");
