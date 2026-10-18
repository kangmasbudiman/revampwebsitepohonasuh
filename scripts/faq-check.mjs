// E2E fitur Kelola FAQ: admin CRUD (tambah/edit inline/toggle aktif/hapus)
// → tampilan publik /faq (hanya aktif, urut sortOrder) + preview FAQ di
// /tentang. Data uji dibuat & dihapus via UI sendiri; 8 FAQ seed dibiarkan.
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/faq-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";

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

const browser = await chromium.launch();
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminCtx.addCookies([
  { name: "pa_session", value: await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE },
]);
const a = await adminCtx.newPage();
a.on("dialog", (dlg) => dlg.accept());
const anon = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const QA1 = `E2E FAQ Alpha ${Date.now()}`;
const QA2 = `E2E FAQ Beta ${Date.now()}`;
const jwb = (n) => `Jawaban uji ${n} — ${Date.now()}`;

// bersihkan sisa run gagal sebelumnya
execSync(`sqlite3 prisma/dev.db "DELETE FROM Faq WHERE question LIKE 'E2E FAQ%';"`);

// ===== 1. Tambah 2 FAQ via admin (urutan tinggi agar paling bawah) =====
await a.goto(`${BASE}/admin/faq`, { waitUntil: "networkidle" });
ok("admin/faq: halaman termuat + list seed tampil", (await a.locator("main div.rounded-2xl").count()) >= 8);

const tambah = async (tanya, jawab, order) => {
  await a.click("summary:has-text('Tambah FAQ Baru')");
  await a.fill('form:has(input[name="question"]) input[name="question"]', tanya);
  await a.fill('form:has(input[name="question"]) textarea[name="answer"]', jawab);
  await a.fill('form:has(input[name="question"]) input[name="sortOrder"]', String(order));
  await a.click('form:has(input[name="question"]) button[type=submit]');
  await a.waitForSelector("text=FAQ tersimpan", { timeout: 30000 });
  await a.goto(`${BASE}/admin/faq`, { waitUntil: "networkidle" });
};
await tambah(QA1, jwb("1"), 901);
await tambah(QA2, jwb("2"), 902);
ok("admin: 2 FAQ uji ditambahkan", (await a.locator(`text=${QA1}`).count()) === 1 && (await a.locator(`text=${QA2}`).count()) === 1);

// ===== 2. Publik /faq: keduanya tampil, urut (Alpha sebelum Beta) =====
await anon.goto(`${BASE}/faq`, { waitUntil: "networkidle" });
const faqTexts = await anon.locator("main details summary").allTextContents();
ok("/faq: 2 FAQ uji tampil publik", faqTexts.some((s) => s.includes(QA1)) && faqTexts.some((s) => s.includes(QA2)));
ok("/faq: urutan benar (Alpha duluan)", faqTexts.findIndex((s) => s.includes(QA1)) < faqTexts.findIndex((s) => s.includes(QA2)));

// ===== 3. Preview FAQ di /tentang: hanya 3 pertama + tidak memuat uji =====
await anon.goto(`${BASE}/tentang`, { waitUntil: "networkidle" });
const previewCount = await anon.locator("main details summary").count();
ok("/tentang: preview FAQ maks 3 pertanyaan", previewCount > 0 && previewCount <= 3, `${previewCount} item`);
ok("/tentang: FAQ uji (urutan 901+) tidak masuk preview", !(await anon.locator("main").textContent()).includes(QA1));

// ===== 4. Edit inline: ubah jawaban + urutan Beta ke paling atas =====
await a.goto(`${BASE}/admin/faq`, { waitUntil: "networkidle" });
const kartu = a.locator("div.rounded-2xl", { hasText: QA2 }).first();
await kartu.locator("summary:has-text('Edit')").click();
const editForm = kartu.locator("form:has(textarea[name='answer'])");
const JWB2 = jwb("2-revisi");
await editForm.locator('textarea[name="answer"]').fill(JWB2);
await editForm.locator('input[name="sortOrder"]').fill("0");
await editForm.locator("button[type=submit]").click();
await a.waitForSelector("text=FAQ tersimpan", { timeout: 30000 });
await a.goto(`${BASE}/admin/faq`, { waitUntil: "networkidle" });
ok("admin: edit tersimpan (Beta urutan 0 paling atas)", (await a.locator("div.rounded-2xl").first().textContent()).includes(QA2));

await anon.goto(`${BASE}/faq`, { waitUntil: "networkidle" });
const faqTexts2 = await anon.locator("main details summary").allTextContents();
ok("/faq: Beta kini pertama setelah edit urutan", faqTexts2[0].includes(QA2));
await anon.locator(`details:has-text("${QA2}") summary`).click();
ok("/faq: jawaban revisi tampil", (await anon.locator(`details:has-text("${QA2}")`).textContent()).includes(JWB2));

// ===== 5. Toggle nonaktif → hilang dari publik, tetap di admin =====
const kartuBeta = a.locator("div.rounded-2xl", { hasText: QA2 }).first();
await kartuBeta.locator("button:has-text('Sembunyikan')").click();
await a.waitForSelector(`div.rounded-2xl:has-text("${QA2}") >> text=Nonaktif`, { timeout: 15000 });
ok("admin: Beta berstatus Nonaktif", true);
await anon.goto(`${BASE}/faq`, { waitUntil: "networkidle" });
ok("/faq: FAQ nonaktif hilang dari publik", !(await anon.locator("main").textContent()).includes(QA2));
await anon.goto(`${BASE}/tentang`, { waitUntil: "networkidle" });
ok("/tentang: FAQ nonaktif tidak masuk preview", !(await anon.locator("main").textContent()).includes(QA2));

// ===== 6. Hapus kedua FAQ uji → publik bersih =====
for (const qa of [QA1, QA2]) {
  await a.locator(`div.rounded-2xl:has-text("${qa}") button:has-text('Hapus')`).first().click();
}
await a.waitForTimeout(1500);
await a.goto(`${BASE}/admin/faq`, { waitUntil: "networkidle" });
ok("cleanup: kedua FAQ uji terhapus", (await a.locator(`text=${QA1}`).count()) === 0 && (await a.locator(`text=${QA2}`).count()) === 0);
await anon.goto(`${BASE}/faq`, { waitUntil: "networkidle" });
const sisa = await anon.locator("main details summary").count();
ok("/faq: kembali menampilkan FAQ seed", sisa >= 8, `${sisa} FAQ`);

await browser.close();
if (gagal) {
  console.error(`\n=== GAGAL: ${gagal} asersi ===`);
  process.exit(1);
}
console.log("\n=== SEMUA TAHAP E2E FAQ LULUS ===");
