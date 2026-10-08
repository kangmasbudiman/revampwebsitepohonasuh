// E2E batas pembayaran order 1x24 jam: order "Menunggu Pembayaran"
// (confirmation='no' tanpa bukti) yang melewati 24 jam otomatis dibatalkan
// saat endpoint ber-hook dipanggil — pohon kembali available, data_adopsi
// terhapus, donatur dapat Pesan; order segar tidak tersentuh; halaman order
// web menampilkan "Batas Pembayaran" untuk order yang masih hidup.
// Jalankan: E2E_BASE=http://localhost:3001 API_BASE_URL=http://127.0.0.1:8001/api node scripts/order-expiry-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api";
const MEMBER = 2679; // budii (QA)

const rows = (sql) =>
  execSync(`mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));

const one = (sql) => rows(sql)[0]?.[0] ?? "";

const assert = (cond, msg) => {
  if (!cond) {
    console.error("✗ GAGAL:", msg);
    process.exit(1);
  }
  console.log("✓", msg);
};

// ============== Fixture: pohon + order kedaluwarsa 25 jam + order segar ==============
const KODE = "EXPE2E";
const INV_OLD = "#EXPE2EOLD";
const INV_NEW = "#EXPE2ENEW";
rows(`DELETE FROM data_adopsi WHERE invoice IN ('${INV_OLD}','${INV_NEW}')`);
rows(`DELETE FROM confirmation WHERE invoice IN ('${INV_OLD}','${INV_NEW}')`);
rows(`DELETE FROM pesan_notif WHERE idmember=${MEMBER} AND pesan LIKE '%1x24 hour payment deadline%'`);
rows(`DELETE FROM data_pohon WHERE idpohon='${KODE}'`);
const DESA = one("SELECT desa FROM data_pohon WHERE desa IS NOT NULL AND desa<>'' LIMIT 1");
rows(
  `INSERT INTO data_pohon (idpohon,latitude,longitude,desa,species,family,localname,status,jenis,slope,soil,beku,nama,keterangan,qrcode,harga,adopted,pengasuh,invoice,tgl_adopt,highlight,diameter,tinggi,keliling,foto_pohon) VALUES ('${KODE}',-1.11,101.11,'${DESA}','Tes','Tes','Pohon Expire E2E','pohon',1,0,0,0,'','','',200000,'reserved',${MEMBER},'${INV_OLD}',CURDATE(),2,10,10,30,NULL)`,
);
const OLD_ID = rows(
  // created_asli order disimpan Eloquent dgn TZ app (UTC) — bukan NOW() MySQL (Jakarta)
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INV_OLD}',CURDATE(),${MEMBER},'E2E Expire','exp@e2e.test','transfer','IDR',200108,CURDATE(),1,'no','E2E',DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR),UTC_TIMESTAMP()); SELECT LAST_INSERT_ID()`,
)[0][0];
rows(
  `INSERT INTO data_adopsi (idpohon,desa,pengasuh,nama,price,cur,methode,tgl_adopt,memo,admin,proses,invoice,tgl_exp,gfrom,created_at,updated_at) VALUES ('${KODE}','${DESA}',${MEMBER},'',200000,'IDR','transfer',CURDATE(),'',0,1,'${INV_OLD}',NULL,0,NOW(),NOW())`,
);
const NEW_ID = rows(
  `INSERT INTO confirmation (invoice,tgl_pesan,idpengasuh,name,email,methode,cur,price,tanggal,jml_pohon,confirmation,confirmationBy,created_at,updated_at) VALUES ('${INV_NEW}',CURDATE(),${MEMBER},'E2E Segar','new@e2e.test','transfer','IDR',200108,CURDATE(),1,'no','E2E',NOW(),NOW()); SELECT LAST_INSERT_ID()`,
)[0][0];
assert(Boolean(OLD_ID && NEW_ID), `fixture: order tua ${OLD_ID} (25 jam) + order segar ${NEW_ID}`);

// ============== 1. Trigger sweep via getconfirmasi ==============
const res = await fetch(`${API}/getconfirmasi`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ idmember: String(MEMBER) }),
});
const konf = await res.json();
const old = konf.find((k) => k.invoice === INV_OLD);
const segar = konf.find((k) => k.invoice === INV_NEW);
assert(old?.confirmation === "cancel", "order 25 jam → confirmation='cancel' setelah sweep");
assert(segar?.confirmation === "no", "order segar tetap 'no' (tidak tersentuh sweep)");
assert(typeof old?.created_at === "string" && old.created_at.length > 0, "getconfirmasi kini bawa created_at");

// ============== 2. Efek DB ==============
assert(
  one(`SELECT CONCAT('[',IFNULL(adopted,''),']') FROM data_pohon WHERE idpohon='${KODE}'`) === "[available]",
  `pohon ${KODE} kembali 'available'`,
);
assert(
  one(`SELECT CONCAT('[',IFNULL(pengasuh,'X'),']') FROM data_pohon WHERE idpohon='${KODE}'`) === "[X]",
  "pohon bersih: pengasuh NULL",
);
assert(
  one(`SELECT COUNT(*) FROM data_adopsi WHERE invoice='${INV_OLD}'`) === "0",
  "data_adopsi order kedaluwarsa terhapus",
);
assert(
  Number(one(`SELECT COUNT(*) FROM pesan_notif WHERE idmember=${MEMBER} AND pesan LIKE '%1x24 hour payment deadline%'`)) >= 1,
  "donatur dapat Pesan pemberitahuan",
);
assert(
  one(`SELECT confirmation FROM confirmation WHERE id=${NEW_ID}`) === "no",
  "order segar masih utuh di DB",
);

// ============== 3. Pohon muncul lagi di daftar available (filtertrees) ==============
const avail = await (
  await fetch(`${API}/filtertrees`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ adopted: "available" }),
  })
).json();
assert(avail.some((t) => t.idpohon === KODE), `filtertrees available memuat ${KODE}`);

// ============== 4. Halaman web: batas pembayaran (order segar) + status dibatalkan (order tua) ==============
const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1].replace(/^"|"$/g, ""),
);
const token = await new SignJWT({ userId: MEMBER, name: "budii", role: "DONOR" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "pa_session", value: token, url: BASE }]);
const page = await ctx.newPage();

await page.goto(`${BASE}/dashboard/adopsi/${NEW_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="batas-pembayaran"]', { timeout: 10000 });
assert(true, "halaman order PENDING_PAYMENT menampilkan kotak Batas Pembayaran");
const batasText = (await page.locator('[data-testid="batas-pembayaran"]').innerText()).trim();
assert(/Selesaikan pembayaran sebelum/.test(batasText), "teks deadline tampil: " + batasText.split("\n")[1]);
const sisaJam = Math.round((new Date(Date.now() + 24 * 3600 * 1000) - new Date()) / 3600000);
assert(batasText.includes(String(new Date().getFullYear())), "deadline memuat tahun berjalan");

await page.goto(`${BASE}/dashboard/adopsi/${OLD_ID}`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Dibatalkan", { timeout: 10000 });
assert(true, "order kedaluwarsa tampil status 'Dibatalkan'");
assert((await page.locator('[data-testid="batas-pembayaran"]').count()) === 0, "kotak batas pembayaran tak tampil utk order cancel");

// ============== 5. createinvoice menolak order cancel ==============
const inv = await fetch(`${API}/createinvoice`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ id: String(OLD_ID) }),
});
const invJson = await inv.json();
assert(invJson.code === 409, `createinvoice menolak order cancel (code ${invJson.code})`);
console.log("   (sisa ±" + sisaJam + " jam — info)");

// ============== Cleanup ==============
rows(`DELETE FROM data_adopsi WHERE invoice IN ('${INV_OLD}','${INV_NEW}')`);
rows(`DELETE FROM confirmation WHERE invoice IN ('${INV_OLD}','${INV_NEW}')`);
rows(`DELETE FROM data_pohon WHERE idpohon='${KODE}'`);
rows(`DELETE FROM pesan_notif WHERE idmember=${MEMBER} AND pesan LIKE '%1x24 hour payment deadline%'`);
await browser.close();
console.log("\n=== SEMUA TAHAP E2E BATAS PEMBAYARAN LULUS ===");
