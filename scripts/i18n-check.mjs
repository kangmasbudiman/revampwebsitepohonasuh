// Verifikasi F2 multi-bahasa: default ID, pa_lang=en → EN + <html lang>,
// dan tombol toggle ID/EN bekerja tanpa reload penuh.
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://localhost:3001";
let gagal = 0;
const cek = (nama, kondisi, detail = "") => {
  const ok = !!kondisi;
  if (!ok) gagal += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${nama}${detail && !ok ? ` — ${detail}` : ""}`);
};

// (path, marker ID, marker EN) — marker = substring yang HANYA ada di
// bahasa tersebut pada HTML SSR halaman itu.
const HALAMAN = [
  ["/", "Cara Kerja Program", "How the Program Works"],
  ["/", "Pohon Siap Diadopsi", "Trees Ready for Adoption"],
  ["/pohon", "Semua Lokasi", "All Locations"],
  ["/spesies", "Katalog Spesies", "Species Catalog"],
  ["/lokasi", "Adopsi di sini", "Adopt here"],
  ["/blog", "Blog Pohon Asuh", "Pohon Asuh Blog"],
  ["/keuangan", "Rincian Pengeluaran", "Expense Details"],
  ["/faq", "Pertanyaan Umum", "Frequently Asked Questions"],
  ["/kontak", "Hubungi Kami", "Contact Us"],
  ["/kalkulator-karbon", "Aktivitas Anda", "Your Activities"],
  ["/syarat-ketentuan", "Syarat &amp; Ketentuan", "Terms &amp; Conditions"],
  ["/kebijakan-privasi", "Kebijakan Privasi", "Privacy Policy"],
  ["/masuk", "Belum punya akun?", "No account yet?"],
  ["/daftar", "Minimal 6 karakter.", "Minimum 6 characters."],
  ["/keranjang", "Keranjang Adopsi", "Adoption Cart"],
];

async function html(path, cookie) {
  const headers = cookie ? { cookie } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.text();
}

// 1. SSR default (tanpa cookie) = Indonesia di semua halaman contoh
for (const [path, idMark] of HALAMAN) {
  const h = await html(path);
  cek(`ID default ${path}`, h.includes(idMark), `tidak memuat "${idMark}"`);
}

// 2. SSR pa_lang=en = Inggris + <html lang="en"> (dan tidak menyisakan ID)
for (const [path, , enMark] of HALAMAN) {
  const h = await html(path, "pa_lang=en");
  cek(`EN cookie ${path}`, h.includes(enMark), `tidak memuat "${enMark}"`);
  if (path === "/") {
    cek('EN <html lang="en">', /<html[^>]* lang="en"/.test(h), h.match(/<html[^>]*>/)?.[0]);
  }
}

// 3. Kembali ke ID via cookie pa_lang=id → lang="id" kembali
{
  const h = await html("/", "pa_lang=id");
  cek('ID cookie <html lang="id">', /<html[^>]* lang="id"/.test(h));
}

// 4. Toggle ID/EN live: klik EN di header → hero & CTA berubah tanpa reload
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.click('div[role="group"] button:text-is("en")');
await page.waitForTimeout(800); // router.refresh() + render ulang server components
// Judul slide hero = konten DB admin (slider API), memang tidak diterjemahkan —
// yang dicek dict-driven: CTA slide + aria karosel.
const heroCta = await page
  .locator('section[aria-roledescription="carousel"] a:has-text("Adopt a Tree Now")')
  .first()
  .isVisible()
  .catch(() => false);
cek("toggle→EN hero CTA", heroCta);
const heroAria = await page
  .locator('section[aria-roledescription="carousel"]')
  .getAttribute("aria-label");
cek("toggle→EN hero aria", heroAria === "Pohon Asuh program highlights", heroAria ?? "");
const ctaEn = await page.getByText("Sign Up Now", { exact: true }).first().isVisible();
cek("toggle→EN CTA daftar", ctaEn);

// 5. Dashboard + modal hadiah dalam EN — fixture sendiri (pola gift-check):
//    daftar user baru, sisipkan order ACTIVE bermata via MySQL, lalu cek UI EN.
const { execSync } = await import("node:child_process");
const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
for (const id of rows(`SELECT id FROM member WHERE emaile LIKE 'e2e_i18n_%'`).map((r) => r[0])) {
  rows(`DELETE FROM data_adopsi WHERE pengasuh=${id}`);
  rows(`DELETE FROM confirmation WHERE idpengasuh=${id}`);
  rows(`DELETE FROM data_basket WHERE id_member=${id}`);
  rows(`DELETE FROM member WHERE id=${id}`);
}
const email = `e2e_i18n_${Date.now()}@test.local`;
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "E2E i18n Donatur");
await page.fill("#email", email);
await page.fill("#phone", `0899${String(Date.now()).slice(-8)}`);
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL("**/dashboard", { timeout: 30000 });
const MEMBER_ID = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
const [TREE, DESA, HARGA] = rows(
  "SELECT idpohon, desa, harga FROM data_pohon WHERE adopted='available' ORDER BY id LIMIT 1",
)[0];
const TS = Date.now().toString(36).toUpperCase();
const tgl = new Date().toISOString().slice(0, 10);
const inv = `#I${TS}A`;
rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation) VALUES ('${inv}','${tgl}',${MEMBER_ID},'E2E i18n Donatur','${email}','Transfer','IDR',${Number(HARGA) + 123},'${tgl}',1,'yes')`,
);
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,gfrom,certnum,dur,memo,admin,proses,invoice,tgl_exp) VALUES ('${TREE}','${DESA}',${MEMBER_ID},'Gift Recipient',${HARGA},'IDR','Transfer','${tgl}',0,'92/E2EIA/${TS}',1,'',0,3,'${inv}',DATE_ADD('${tgl}', INTERVAL 1 YEAR))`,
);
const CONF = rows(`SELECT id FROM confirmation WHERE invoice='${inv}'`)[0][0];
cek("fixture order ACTIVE terbuat", !!CONF && !!MEMBER_ID);

// dashboard EN (cookie EN dari toggle tadi masih melekat di context ini)
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
const enDash = await page.getByText("My Adoptions").first().isVisible().catch(() => false);
cek("EN dashboard 'My Adoptions'", enDash);

// halaman adopsi aktif → tombol kirim hadiah + modal EN
await page.goto(`${BASE}/dashboard/adopsi/${CONF}`, { waitUntil: "networkidle" });
const kirim = page.getByRole("button", { name: "Send to Recipient" });
if (await kirim.count()) {
  await kirim.first().click();
  await page.waitForTimeout(400);
  const modalEn = await page.getByText("Send Gift Certificate").first().isVisible().catch(() => false);
  cek("EN modal hadiah", modalEn);
  const waEn = await page
    .locator("textarea, p, div")
    .filter({ hasText: "gifted you a tree adoption" })
    .first()
    .isVisible()
    .catch(() => false);
  cek("EN template pesan WA", waEn);
} else {
  cek("EN tombol 'Send to Recipient'", false, "tombol tidak ditemukan di detail order");
}

await page.screenshot({ path: "screenshots/130-i18n-en-dashboard.png" });
await browser.close();

if (gagal > 0) {
  console.error(`\n${gagal} pemeriksaan GAGAL`);
  process.exit(1);
}
console.log("\ni18n-check: semua lulus");
