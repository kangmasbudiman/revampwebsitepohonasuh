// E2E pesan "Message and Impression" sertifikat: donatur (pemilik) dapat
// menambah/mengubah memo setelah sertifikat terbit; guest & member lain
// TIDAK melihat form; API menolak non-pemilik (403). Fixture certnum
// DINAMIS (pengasuh tunggal) + memo lama dipulihkan di akhir.
// Jalankan: E2E_BASE=http://localhost:3001 node scripts/memo-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";

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

// ===== Fixture: certnum pengasuh tunggal terbaru =====
const [CERT, PEMILIK] = rows(
  `SELECT certnum, MIN(pengasuh) FROM data_adopsi WHERE certnum<>'' AND certnum IS NOT NULL
   GROUP BY certnum HAVING COUNT(DISTINCT pengasuh)=1 ORDER BY MAX(id) DESC LIMIT 1`,
)[0].map((v) => v);
if (!CERT) throw new Error("butuh certnum fixture");
// Sentinel — mysql -B membuang kolom kosong di ujung baris (lesson lama)
const MEMO_LAMA = rows(
  `SELECT CONCAT('[',IFNULL(memo,''),']') FROM data_adopsi WHERE certnum='${CERT}' LIMIT 1`,
)[0][0].slice(1, -1);
const N_BARIS = rows(`SELECT COUNT(*) FROM data_adopsi WHERE certnum='${CERT}'`)[0][0];
const token = await new SignJWT({ userId: Number(PEMILIK), name: "Pemilik QA", role: "USER" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
// URL sertifikat: certnum mengandung '/' → path multi-segmen literal
const certUrl = `${BASE}/sertifikat/${CERT}`;
console.log(`Fixture: certnum=${CERT} pemilik=${PEMILIK} baris=${N_BARIS} memoLama=[${MEMO_LAMA}]`);

const browser = await chromium.launch();

// ===== 1. Guest: form TIDAK tampil =====
const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await guest.goto(certUrl, { waitUntil: "networkidle" });
ok("sertifikat termuat (no. tampil)", (await guest.locator("main").textContent()).includes(CERT.split("/")[0]));
ok("guest: form memo TIDAK tampil", (await guest.locator('textarea[name="memo"]').count()) === 0);
await guest.close();

// ===== 2. Pemilik login: form tampil, isi memo =====
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();
await page.goto(certUrl, { waitUntil: "networkidle" });
const ta = page.locator('textarea[name="memo"]');
await ta.waitFor({ timeout: 8000 });
ok("pemilik: form memo tampil", (await ta.count()) === 1);
ok("pemilik: textarea prefilled memo saat ini", (await ta.inputValue()) === MEMO_LAMA.trim());

const MEMO_BARU = `Pesan E2E memo-check ${Date.now()}`;
await ta.fill(MEMO_BARU);
await page.click('button:has-text("Simpan Pesan")');
// Server action + revalidate → router.refresh; sertifikat menampilkan memo baru
await page.waitForSelector(`text=${MEMO_BARU}`, { timeout: 20000 });
ok("sertifikat menampilkan memo baru (tanpa reload)", true);
ok(
  "heading 'Message and Impression' tampil",
  (await page.locator('p:has-text("Message and Impression")').count()) >= 1,
);

// DB: SEMUA baris certnum ber-memo sama
await new Promise(async (resolve) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    const beda = rows(`SELECT COUNT(*) FROM data_adopsi WHERE certnum='${CERT}' AND memo='${MEMO_BARU.replace(/'/g, "\\'")}'`)[0][0];
    if (beda === N_BARIS) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  resolve();
});
const sama = rows(`SELECT COUNT(*) FROM data_adopsi WHERE certnum='${CERT}' AND memo='${MEMO_BARU.replace(/'/g, "\\'")}'`)[0][0];
ok(`DB: semua ${N_BARIS} baris certnum ber-memo baru`, sama === N_BARIS, `${sama}/${N_BARIS}`);

// ===== 3. Kosongkan → blok memo hilang dari sertifikat =====
await ta.fill("");
await page.click('button:has-text("Simpan Pesan")');
await page.waitForFunction(
  () => !document.body.textContent.includes("Message and Impression:"),
  { timeout: 20000 },
);
ok("memo dikosongkan → blok hilang dari sertifikat", true);

// ===== 4. Member lain: form TIDAK tampil =====
const tokenLain = await new SignJWT({ userId: 2682, name: "Admin QA", role: "ADMIN" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
const ctxLain = await browser.newContext();
ctxLain.addCookies([{ name: "pa_session", value: tokenLain, url: BASE }]);
const pageLain = await ctxLain.newPage();
await pageLain.goto(certUrl, { waitUntil: "networkidle" });
ok("member lain: form memo TIDAK tampil", (await pageLain.locator('textarea[name="memo"]').count()) === 0);

// ===== 5. Restore =====
execSync(
  `mysql -uroot -pkerabatkotak pohonasuh2 -e "UPDATE data_adopsi SET memo='${MEMO_LAMA.replace(/'/g, "\\'")}' WHERE certnum='${CERT}'" 2>/dev/null`,
);
ok("cleanup: memo lama dipulihkan", true);

await browser.close();
console.log(gagal === 0 ? "\nSEMUA LULUS" : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
