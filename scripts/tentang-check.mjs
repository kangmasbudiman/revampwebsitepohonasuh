// E2E fitur "Tentang Pohon Asuh": halaman publik /tentang (konten dinamis
// dari admin, fallback dict saat kosong) + admin /admin/tentang (form teks +
// daftar langkah dinamis tambah/hapus/naik-turun) + API Laravel
// tentangpublik/tentangkonten/simpantentang. Tabel dikosongkan saat mulai
// dan di-TRUNCATE lagi di akhir.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/tentang-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

let gagal = 0;
const ok = (nama, kondisi, detail = "") => {
  console.log(`${kondisi ? "PASS" : "FAIL"} — ${nama}${detail ? ` (${detail})` : ""}`);
  if (!kondisi) gagal++;
};

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(secret);

execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "TRUNCATE TABLE tentang; TRUNCATE TABLE tentang_langkah" 2>/dev/null`);
const browser = await chromium.launch();

// ===== 1. Tabel kosong: /tentang pakai fallback dict + API null =====
const kosong = await (await fetch(`${API}/tentangpublik`)).json();
ok("API tentangpublik kosong: judul/deskripsi null + langkah []", kosong.judul === null && kosong.langkah.length === 0);

const anon = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await anon.goto(`${BASE}/tentang`, { waitUntil: "networkidle" });
ok("/tentang kosong: status 200 + halaman termuat", (await anon.locator("h1").count()) === 1);
const teksKosong = await anon.locator("main").textContent();
ok("/tentang kosong: judul fallback tampil", teksKosong.includes("Tentang Pohon Asuh"));
ok("/tentang kosong: langkah fallback tampil (5 kartu)", (await anon.locator("main ol li").count()) === 5);
ok("nav header memuat link /tentang", (await anon.locator("header a[href='/tentang']").count()) >= 1);
ok("footer memuat link /tentang", (await anon.locator("footer a[href='/tentang']").count()) === 1);
await anon.screenshot({ path: "screenshots/120-tentang-fallback.png", fullPage: false });

// ===== 2. Admin: isi konten + langkah dinamis + reorder → simpan =====
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminCtx.addCookies([
  { name: "pa_session", value: await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE },
]);
const a = await adminCtx.newPage();
a.on("dialog", (dlg) => dlg.accept());
await a.goto(`${BASE}/admin/tentang`, { waitUntil: "networkidle" });
ok("admin/tentang: halaman termuat", (await a.locator("h1", { hasText: "Tentang Pohon Asuh" }).count()) === 1);
ok("admin/tentang: form kosong saat tabel kosong", (await a.locator('input[name="judul"]').inputValue()) === "");

await a.fill('input[name="judul"]', "Tentang Pohon Asuh E2E");
await a.fill('textarea[name="deskripsi"]', "Paragraf deskripsi uji.\n\nParagraf kedua.");
await a.fill('textarea[name="mekanisme"]', "Mekanisme uji singkat.");
const isiLangkah = async (i, judul, teks) => {
  await a.locator(`input[placeholder='Judul langkah'] >> nth=${i}`).fill(judul);
  await a.locator(`textarea[placeholder='Penjelasan langkah'] >> nth=${i}`).fill(teks);
};
// 2 langkah tambahan (form mulai kosong → klik Tambah Langkah 2×)
await a.click("button:has-text('Tambah Langkah')");
await a.click("button:has-text('Tambah Langkah')");
await isiLangkah(0, "Langkah Pertama", "Isi langkah pertama.");
await isiLangkah(1, "Langkah Kedua", "Isi langkah kedua.");
// reorder: turunkan baris pertama → urutan tertukar
await a.locator("button[aria-label='Turun']").first().click();
await a.click("button[type=submit]:has-text('Simpan Konten')");
await a.waitForSelector("text=Konten Tentang tersimpan", { timeout: 30000 });
ok("admin/tentang: simpan sukses (banner tampil)", true);

const dbLangkah = rows("SELECT judul, isi, urutan FROM tentang_langkah ORDER BY urutan");
ok("DB: tentang row tunggal tersimpan", rows("SELECT judul FROM tentang")[0][0] === "Tentang Pohon Asuh E2E");
ok("DB: 2 langkah urutan 0,1 hasil reorder", dbLangkah.length === 2 && dbLangkah[0][2] === "0" && dbLangkah[1][2] === "1",
  dbLangkah.map((r) => `${r[0]}(${r[2]})`).join(", "));
ok("DB: reorder tersimpan (Kedua duluan)", dbLangkah[0][0] === "Langkah Kedua" && dbLangkah[1][0] === "Langkah Pertama");

// ===== 3. Publik menampilkan konten + urutan langkah =====
await anon.goto(`${BASE}/tentang`, { waitUntil: "networkidle" });
const teksIsi = await anon.locator("main").textContent();
ok("/tentang: judul admin tampil", teksIsi.includes("Tentang Pohon Asuh E2E"));
ok("/tentang: deskripsi paragraf terpisah", (await anon.locator("main p", { hasText: "Paragraf kedua" }).count()) === 1);
ok("/tentang: mekanisme tampil sebagai kartu bernomor", teksIsi.includes("Mekanisme uji singkat."));
const liTeks = await anon.locator("main ol li").allTextContents();
ok("/tentang: 2 langkah urutan hasil reorder", liTeks.length === 2 && liTeks[0].includes("Langkah Kedua") && liTeks[1].includes("Langkah Pertama"),
  liTeks.map((t) => t.slice(0, 20)).join(" | "));
await anon.screenshot({ path: "screenshots/121-tentang-terisi.png", fullPage: false });

// ===== 4. Edit: hapus 1 langkah + nonaktifkan → publik ikut =====
await a.goto(`${BASE}/admin/tentang`, { waitUntil: "networkidle" });
ok("admin/tentang: form termuat ulang dari DB", (await a.locator('input[name="judul"]').inputValue()) === "Tentang Pohon Asuh E2E");
await a.locator("button[aria-label='Hapus langkah 2']").click();
await a.click("button[type=submit]:has-text('Simpan Konten')");
await a.waitForSelector("text=Konten Tentang tersimpan", { timeout: 30000 });
ok("DB: 1 langkah tersisa", rows("SELECT COUNT(*) FROM tentang_langkah")[0][0] === "1");
await anon.goto(`${BASE}/tentang`, { waitUntil: "networkidle" });
ok("/tentang: publik kini 1 langkah", (await anon.locator("main ol li").count()) === 1);

// ===== 5. Cleanup: TRUNCATE → fallback kembali =====
execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -e "TRUNCATE TABLE tentang; TRUNCATE TABLE tentang_langkah" 2>/dev/null`);
await anon.goto(`${BASE}/tentang`, { waitUntil: "networkidle" });
ok("cleanup: /tentang kembali fallback", (await anon.locator("main ol li").count()) === 5);
ok("cleanup: tabel dikosongkan", rows("SELECT COUNT(*) FROM tentang_langkah")[0][0] === "0");

await browser.close();
if (gagal) {
  console.error(`\n=== GAGAL: ${gagal} asersi ===`);
  process.exit(1);
}
console.log("\n=== SEMUA TAHAP E2E TENTANG LULUS ===");
