// E2E anti fan-out: data_pohon.idpohon TIDAK unik (B125/E065/E072/SK070) —
// order 1 pohon ber-kode duplikat harus tetap tampil 1 item di dashboard,
// subtotal konsisten dengan confirmation.price, dan endpoint turunannya
// (mytrees/mytreesgroup/fototagingorder/ordercustomer/ordercustomerbypengurus)
// membalas tepat 1 baris per data_adopsi.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/dup-pohon-check.mjs
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

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};

// ============== Fixture (cleanup sisa, pilih kode duplikat dinamis) ==============
const INVOICE = "#DUPE2E1";
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);

const dup = rows("SELECT idpohon FROM data_pohon GROUP BY idpohon HAVING COUNT(*)>1 LIMIT 1")[0]?.[0];
assert(Boolean(dup), "ada kode idpohon duplikat di data_pohon (prekondisi fixture)");
const DESA = rows(`SELECT desa FROM data_pohon WHERE idpohon='${dup}' LIMIT 1`)[0][0];

const KONF_ID = rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INVOICE}',CURDATE(),2679,'E2E Dup','dup@e2e.test','transfer','IDR',200108,CURDATE(),1,'no','E2E',NOW(),NOW()); SELECT LAST_INSERT_ID()`,
)[0][0];
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,created_at,updated_at) VALUES ('${dup}','${DESA}',2679,'Tes Duplikat',200000,'IDR','transfer',CURDATE(),'',0,1,'${INVOICE}',NULL,NOW(),NOW())`,
);
assert(Boolean(KONF_ID), `fixture: 1 confirmation (id ${KONF_ID}) + 1 data_adopsi kode ${dup} (${DESA})`);

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const donorToken = await new SignJWT({ userId: 2679, name: "budii", role: "DONOR" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

// ============== 1. API: 5 endpoint balas 1 baris per data_adopsi ==============
const post = async (ep, form) => {
  const res = await fetch(`${API}/${ep}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  return res.json();
};
const myTrees = await post("mytrees", { iduser: 2679 });
const nMyTrees = myTrees.filter((r) => r.invoice === INVOICE).length;
assert(nMyTrees === 1, `mytrees: 1 baris utk ${INVOICE} (dapat ${nMyTrees})`);
const myTreesGroup = await post("mytreesgroup", { iduser: 2679 });
assert(
  myTreesGroup.filter((r) => r.invoice === INVOICE).length === 1,
  "mytreesgroup: 1 baris",
);
const fotoOrder = await post("fototagingorder", { invoice: INVOICE });
assert(Array.isArray(fotoOrder) && fotoOrder.length === 1, "fototagingorder: 1 item");
const byPengurus = await post("ordercustomerbypengurus", { iduser: 2683 });
assert(
  byPengurus.filter((r) => r.invoice === INVOICE).length === 1,
  "ordercustomerbypengurus: 1 baris",
);
const orderCustomer = await (await fetch(`${API}/ordercustomer`)).json();
assert(
  orderCustomer.filter((r) => r.invoice === INVOICE).length === 1,
  "ordercustomer: 1 baris",
);

// ============== 2. Halaman detail order donatur ==============
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: donorToken, url: BASE }]);
const page = await ctx.newPage();

await page.goto(`${BASE}/dashboard/adopsi/${KONF_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector(`text=${INVOICE}`, { timeout: 10000 });
const kartu = page.locator("main .rounded-2xl", { hasText: dup });
assert((await kartu.count()) === 1, `detail order: tepat 1 kartu pohon ${dup} (bukan duplikat)`);
const bodyText = await page.locator("main").innerText();
assert(!bodyText.includes("400.000"), "subtotal tidak dobel (tanpa 400.000)");
assert(/Rp[\s ]?200\.000/.test(bodyText), "subtotal tampil Rp 200.000");
assert(/Rp[\s ]?200\.108/.test(bodyText), "Total Transfer tampil Rp 200.108 (200.000 + kode unik 8)");
assert(bodyText.includes("8"), "kode unik 8 tampil");

// ============== 3. Dashboard list: 1 baris order (tabel per kode pohon) ==============
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.waitForSelector("tbody tr", { timeout: 10000 });
const rowInv = page.locator("tbody tr", { hasText: dup });
assert((await rowInv.count()) === 1, `dashboard list: 1 baris utk ${dup} (bukan duplikat)`);

// ============== Cleanup ==============
rows(`DELETE FROM data_adopsi WHERE invoice='${INVOICE}'`);
rows(`DELETE FROM confirmation WHERE invoice='${INVOICE}'`);
await browser.close();
console.log("\n=== SEMUA TAHAP E2E ANTI-DUPLIKAT LULUS ===");
