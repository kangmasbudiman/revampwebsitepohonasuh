// E2E 9 gap fitur website-lama (pohonasuh.org) yang diadopsi ke web baru:
//  #1 pohon unggulan (admin toggle → beranda), #2 koreksi nama/memo order,
//  #3 kirim pesan manual ke member, #4 catatan order tagging, #5 laporan
//  dana per desa, #6 galeri multi-foto pohon, #7 adopsi multi-tahun,
//  #8 adopsi hadiah, #9 CRUD nomor WA admin.
// Butuh: web server (E2E_BASE, default :3000) + Laravel :8000 + MySQL.
// Semua data uji dikembalikan/dibersihkan di akhir.
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { execSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const LARAVEL = "/opt/homebrew/var/www/restApiPohonasuh";

const rows = (sql) =>
  execSync(
    `mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`,
  )
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Polling DB sampai kondisi terpenuhi (upload/form server action lambat).
async function waitForDb(fn, timeout = 20000, label = "DB") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const v = fn();
      if (v) return v;
    } catch {}
    await sleep(400);
  }
  throw new Error(`waitForDb timeout: ${label}`);
}

const secret = new TextEncoder().encode(
  fs.readFileSync(".env", "utf8").match(/AUTH_SECRET="(.+)"/)[1],
);
const adminToken = await new SignJWT({
  userId: 2682,
  name: "Admin Pohon Asuh",
  role: "ADMIN",
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(secret);

// Pohon uji: available, urut id. Index ≥6 agar tak bentrok fallback 6
// pohon beranda; id kecil agar pasti di halaman 1 tabel admin (50 baris).
const avail = rows(
  "SELECT id, idpohon, harga, highlight FROM data_pohon WHERE adopted='available' ORDER BY id",
);
const pick = (i) => avail[i];
const [ID_A, TREE_A, HARGA_A] = [pick(6)[0], pick(6)[1], Number(pick(6)[2])];
const [ID_B, TREE_B, HARGA_B] = [pick(7)[0], pick(7)[1], Number(pick(7)[2])];
// Kandidat unggulan: available, tanpa highlight, di luar 6 fallback beranda.
const uIdx = avail.findIndex(
  (r, i) => i >= 6 && (r[3] === "NULL" || r[3] === null || r[3] === "\\N"),
);
const [ID_U, TREE_U] = [avail[uIdx][0], avail[uIdx][1]];
// Tabel admin membagi 50 baris/halaman urut PK — hitung halamannya.
const posU = Number(
  rows(`SELECT COUNT(*)+1 FROM data_pohon WHERE id<${ID_U}`)[0][0],
);
const pageU = Math.ceil(posU / 50);
if (!TREE_A || !TREE_B || !TREE_U) throw new Error("butuh 3 pohon available");
console.log(
  `Pohon uji: A=${TREE_A}(${HARGA_A}) B=${TREE_B}(${HARGA_B}) U=${TREE_U}`,
);

const fmt = (n) => new Intl.NumberFormat("id-ID").format(n);

const browser = await chromium.launch();
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
adminCtx.addCookies([{ name: "pa_session", value: adminToken, url: BASE }]);
const adminPage = await adminCtx.newPage();
adminPage.on("dialog", (d) => d.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await adminPage.addInitScript(() => {
  // document.documentElement masih null saat init — tunda sampai DOM siap
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});

// ===== 1. Daftar donatur baru (utk alur adopsi multi-tahun & hadiah) =====
const email = `gaps_${Date.now()}@test.local`;
const userCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await userCtx.newPage();
await page.goto(`${BASE}/daftar`, { waitUntil: "networkidle" });
await page.fill("#name", "Gaps E2E Donatur");
await page.fill("#email", email);
await page.fill("#phone", "081234567811");
await page.fill("#password", "rahasia123");
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
const memberId = rows(`SELECT id FROM member WHERE emaile='${email}'`)[0][0];
assert(true, `donatur terdaftar id=${memberId}`);

// ===== #7+#8: adopsi langsung 3 tahun + hadiah =====
await page.goto(`${BASE}/pohon/${TREE_A}`, { waitUntil: "networkidle" });
await page.click("button:text-is('3 tahun')");
await page.click("button:has-text('Adopsi sebagai hadiah')");
await page.fill("#gift-name", "Ibu Sinta");
await page.fill("#gift-note", "Selamat hari ibu!");
const totalText = await page
  .locator("span:text-is('Total')")
  .first()
  .locator("xpath=..")
  .textContent();
assert(
  (totalText.match(/\d/g) || []).join("") === String(HARGA_A * 3),
  `panel total = ${HARGA_A}×3`,
);
await page.click("button:has-text('Adopsi Sekarang')");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
const confId1 = page.url().match(/\/dashboard\/adopsi\/(\d+)/)[1];
await page.waitForSelector("text=Instruksi Pembayaran", { timeout: 15000 });
const body1 = await page.textContent("main");
assert(body1.includes("Durasi 3 tahun"), "invoice: Durasi 3 tahun");
assert(body1.includes("Ibu Sinta"), "invoice: sertifikat a.n. Ibu Sinta");
assert(body1.includes("Selamat hari ibu"), "invoice: memo hadiah tampil");

const [inv1, price1] = rows(
  `SELECT invoice, price FROM confirmation WHERE id=${confId1}`,
)[0];
const [dur1, nama1, memo1, priceAd1] = rows(
  `SELECT dur, nama, memo, price FROM data_adopsi WHERE invoice='${inv1}'`,
)[0];
assert(Number(dur1) === 3, `data_adopsi.dur=3 (${dur1})`);
assert(nama1 === "Ibu Sinta", `data_adopsi.nama=${nama1}`);
assert(memo1 === "Selamat hari ibu!", `data_adopsi.memo=${memo1}`);
assert(Number(priceAd1) === HARGA_A * 3, `price=${priceAd1} = harga×3`);
const uniq1 = Number(price1) - HARGA_A * 3;
assert(
  uniq1 >= 100 && uniq1 <= 999,
  `confirmation.price=${price1} = ${HARGA_A * 3} + kode unik ${uniq1}`,
);

// ===== #4: catatan order tagging (petugas; order harus terverifikasi) =====
const [petugasId, petugasDesa] = rows(
  "SELECT dp.idpetugas, d.nama FROM desa_petugas dp JOIN desa d ON d.id=dp.iddesa JOIN data_pohon p ON p.desa=d.nama AND p.adopted='available' LIMIT 1",
)[0];
const TREE_P = rows(
  `SELECT idpohon FROM data_pohon WHERE adopted='available' AND desa='${petugasDesa}' ORDER BY id LIMIT 1`,
)[0][0];
const petugasName = rows(
  `SELECT name FROM member WHERE id=${petugasId}`,
)[0][0];
await page.goto(`${BASE}/pohon/${TREE_P}`, { waitUntil: "networkidle" });
await page.click("button:has-text('Adopsi Sekarang')");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
const confId3 = page.url().match(/\/dashboard\/adopsi\/(\d+)/)[1];
const inv3 = rows(`SELECT invoice FROM confirmation WHERE id=${confId3}`)[0][0];
const adopsiId3 = rows(
  `SELECT id FROM data_adopsi WHERE invoice='${inv3}' LIMIT 1`,
)[0][0];
// order taggable hanya bila terverifikasi — set langsung (data uji milik sendiri)
rows(`UPDATE confirmation SET confirmation='yes' WHERE id=${confId3}`);

const petugasToken = await new SignJWT({
  userId: Number(petugasId),
  name: petugasName,
  role: "ADMIN",
  level: 2,
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);
const petugasCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
petugasCtx.addCookies([{ name: "pa_session", value: petugasToken, url: BASE }]);
const petugasPage = await petugasCtx.newPage();
petugasPage.on("dialog", (d) => d.accept());
// ConfirmSubmit kini modal — auto-klik tombol konfirmasinya (setara accept dialog lama)
await petugasPage.addInitScript(() => {
  // document.documentElement masih null saat init — tunda sampai DOM siap
  const pasang = () => {
    new MutationObserver(() => {
      document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
        if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.documentElement ? pasang() : addEventListener("DOMContentLoaded", pasang, { once: true });
});
await petugasPage.goto(`${BASE}/admin/tagging`, { waitUntil: "networkidle" });
const noteForm = petugasPage
  .locator(`div:has-text("${TREE_P}") form:has(input[name="note"])`)
  .first();
const noteId = await noteForm.locator('input[name="id"]').inputValue();
assert(Number(noteId) === Number(adopsiId3), `form catatan → order ${noteId}`);
const noteText = `Catatan E2E ${Date.now()}`;
await noteForm.locator('input[name="note"]').fill(noteText);
await noteForm.locator("button:has-text('Simpan Catatan')").click();
await petugasPage.waitForURL(/catatan=1/, { timeout: 20000 });
const noteDb = await waitForDb(
  () => rows(`SELECT note FROM image WHERE idorder=${adopsiId3} LIMIT 1`)[0]?.[0],
  15000,
  "image.note",
);
assert(noteDb === noteText, `image.note tersimpan dari UI petugas`);
// pulihkan: hapus order uji + baris catatan, pohon balik available
rows(`DELETE FROM image WHERE idorder=${adopsiId3}`);
rows(`DELETE FROM data_adopsi WHERE invoice='${inv3}'`);
rows(`DELETE FROM confirmation WHERE id=${confId3}`);
rows(`UPDATE data_pohon SET adopted='available' WHERE idpohon='${TREE_P}'`);
await petugasCtx.close();
assert(true, `cleanup order petugas (${TREE_P} balik available)`);

// ===== #2: koreksi nama/memo order (admin) =====
await adminPage.goto(`${BASE}/admin/order/${encodeURIComponent(inv1)}`, {
  waitUntil: "networkidle",
});
assert(
  (await adminPage.textContent("h1")).includes(inv1),
  "halaman koreksi order terbuka",
);
await adminPage.fill('input[name="nama"]', "Nama Koreksi E2E");
await adminPage.fill('textarea[name="memo"]', "Memo koreksi E2E");
await adminPage.click("button:has-text('Simpan Perubahan')");
await adminPage.waitForURL(/saved=1/, { timeout: 20000 });
const [namaK, memoK] = await waitForDb(
  () =>
    rows(
      `SELECT nama, memo FROM data_adopsi WHERE invoice='${inv1}' LIMIT 1`,
    )[0],
  15000,
  "koreksi",
);
assert(namaK === "Nama Koreksi E2E", `koreksi nama → ${namaK}`);
assert(memoK === "Memo koreksi E2E", `koreksi memo → ${memoK}`);
// pulihkan nama penerima hadiah (uji updatemeko tak boleh merusak data lain)
await adminPage.fill('input[name="nama"]', "Ibu Sinta");
await adminPage.fill('textarea[name="memo"]', "Selamat hari ibu!");
await adminPage.click("button:has-text('Simpan Perubahan')");
await adminPage.waitForURL(/saved=1/, { timeout: 20000 });

// ===== batalkan order uji #1 (pohon balik available) =====
await page.goto(`${BASE}/dashboard/adopsi/${confId1}`, { waitUntil: "networkidle" });
await page.click("button:has-text('Batalkan Adopsi')");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
assert(
  rows(`SELECT adopted FROM data_pohon WHERE idpohon='${TREE_A}'`)[0][0] ===
    "available",
  `${TREE_A} balik available`,
);

// ===== #7+#8 jalur keranjang: 2 tahun + hadiah, ubah di checkout =====
await page.goto(`${BASE}/pohon/${TREE_B}`, { waitUntil: "networkidle" });
await page.click("button:text-is('2 tahun')");
await page.click("button:has-text('Adopsi sebagai hadiah')");
await page.fill("#gift-name", "Kakak Tercinta");
await page.click("button:has-text('Tambah ke Keranjang')");
await page.goto(`${BASE}/keranjang`, { waitUntil: "networkidle" });
const cartBody = await page.textContent("main");
assert(cartBody.includes("Kakak Tercinta"), "keranjang: hadiah utk Kakak Tercinta");
assert(
  (cartBody.match(/Rp\s?[\d.]+/g) || []).some(
    (s) => s.replace(/\D/g, "") === String(HARGA_B * 2),
  ),
  `keranjang: total = harga×2`,
);

await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle" });
await page.click("button:text-is('3 thn')"); // ubah durasi via keranjang
await page.click("button:has-text('Buat Pesanan')");
await page.waitForURL(/\/dashboard\/adopsi\/\d+/, { timeout: 30000 });
const confId2 = page.url().match(/\/dashboard\/adopsi\/(\d+)/)[1];
const inv2 = rows(`SELECT invoice FROM confirmation WHERE id=${confId2}`)[0][0];
const [dur2, nama2] = rows(
  `SELECT dur, nama FROM data_adopsi WHERE invoice='${inv2}' LIMIT 1`,
)[0];
assert(Number(dur2) === 3, `checkout ubah durasi → dur=3 (${dur2})`);
assert(nama2 === "Kakak Tercinta", `hadiah ikut checkout → nama=${nama2}`);
await page.waitForSelector("text=Durasi 3 tahun", { timeout: 15000 });
await page.click("button:has-text('Batalkan Adopsi')");
await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
assert(
  rows(`SELECT COUNT(*) FROM data_basket WHERE id_member='${memberId}'`)[0][0] ===
    "0",
  "basket server kosong setelah checkout",
);

// ===== #1: pohon unggulan (admin toggle → beranda) =====
await adminPage.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await adminPage.fill('input[aria-label="Cari pohon"]', TREE_U);
await adminPage.waitForTimeout(400);
const rowU = adminPage.locator("tr", { hasText: TREE_U }).first();
await rowU.locator("button:has-text('Jadikan')").click();
await adminPage.waitForURL(/unggulan=1/, { timeout: 20000 });
assert(
  rows(`SELECT highlight FROM data_pohon WHERE idpohon='${TREE_U}'`)[0][0] ===
    "1",
  `${TREE_U} highlight=1`,
);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const onHome = await page
  .locator(`a[href="/pohon/${TREE_U}"]`)
  .count();
assert(onHome > 0, "beranda menampilkan pohon unggulan");

await adminPage.goto(`${BASE}/admin/pohon`, { waitUntil: "networkidle" });
await adminPage.fill('input[aria-label="Cari pohon"]', TREE_U);
await adminPage.waitForTimeout(400);
await adminPage
  .locator("tr", { hasText: TREE_U })
  .first()
  .locator("button:has-text('Unggulan')")
  .click();
await adminPage.waitForURL(/unggulan=0/, { timeout: 20000 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
assert(
  (await page.locator(`a[href="/pohon/${TREE_U}"]`).count()) === 0,
  "beranda bersih setelah unggulan dilepas",
);

// ===== #3: kirim pesan manual ke member =====
await adminPage.goto(
  `${BASE}/admin/user?kirim=${memberId}`,
  { waitUntil: "networkidle" },
);
const pesanText = `Pesan uji E2E ${Date.now()}`;
await adminPage.fill('textarea[name="pesan"]', pesanText);
await adminPage.click("button[type=submit]:has-text('Kirim Pesan')");
await adminPage.waitForURL(/updated=/, { timeout: 20000 });
const pesanDb = await waitForDb(
  () =>
    rows(
      `SELECT id FROM pesan_notif WHERE idmember='${memberId}' AND pesan='${pesanText}' LIMIT 1`,
    )[0]?.[0],
  15000,
  "pesan_notif",
);
assert(!!pesanDb, "pesan_notif tersimpan dari admin UI");
rows(`DELETE FROM pesan_notif WHERE id=${pesanDb}`);
assert(true, "cleanup pesan");

// ===== #9: CRUD nomor WA admin =====
await adminPage.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
const waNum = `62899${Date.now() % 1000000}`;
await adminPage
  .locator("form:has(button:has-text('Tambah Nomor')) input[name=nomer]")
  .fill(waNum);
await adminPage.click("button:has-text('Tambah Nomor')");
await adminPage.waitForURL(/wasaved=/, { timeout: 20000 });
const waId = await waitForDb(
  () =>
    rows(
      `SELECT id FROM kontak_admin WHERE nomer_admin='${waNum}' LIMIT 1`,
    )[0]?.[0],
  15000,
  "kontak_admin",
);
assert(!!waId, `nomor WA tersimpan id=${waId}`);

await adminPage.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
const waEditForm = adminPage.locator(
  `form:has(input[type=hidden][value="${waId}"]):has(input[name="nomer"])`,
);
await waEditForm.locator('input[name="nomer"]').fill("081234567812");
await waEditForm.locator("button:has-text('Simpan')").click();
await adminPage.waitForURL(/wasaved=/, { timeout: 20000 });
const waEdited = await waitForDb(
  () =>
    rows(
      `SELECT nomer_admin FROM kontak_admin WHERE id=${waId} AND nomer_admin='081234567812'`,
    )[0]?.[0],
  15000,
  "edit kontak_admin",
);
assert(waEdited === "081234567812", "nomor WA teredit");

await adminPage.goto(`${BASE}/admin/pengaturan`, { waitUntil: "networkidle" });
await adminPage
  .locator(`form:has(input[type=hidden][value="${waId}"]) button:has-text('Hapus')`)
  .click();
await adminPage.waitForURL(/wasaved=/, { timeout: 20000 });
await waitForDb(() => {
  const c = rows(`SELECT COUNT(*) FROM kontak_admin WHERE id=${waId}`)[0][0];
  return c === "0" ? "gone" : null;
}, 15000, "hapus kontak_admin");
assert(true, "nomor WA terhapus");

// ===== #6: galeri multi-foto pohon =====
fs.writeFileSync(
  "/tmp/gaps-galeri.png",
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);
await adminPage.goto(
  `${BASE}/admin/pohon/${encodeURIComponent(TREE_A)}/galeri`,
  { waitUntil: "networkidle" },
);
await adminPage.setInputFiles('input[type=file]', "/tmp/gaps-galeri.png");
await adminPage.click("button:has-text('Unggah Foto')");
const fotoUrl = await waitForDb(() => {
  const r = rows(
    `SELECT id, urlnya FROM imagepohon WHERE idpohon='${TREE_A}' ORDER BY id DESC LIMIT 1`,
  )[0];
  return r && r[1].includes("/upload/pohon/") ? r : null;
}, 20000, "imagepohon");
assert(!!fotoUrl, `foto galeri tersimpan (id=${fotoUrl[0]})`);
const fotoFile = fotoUrl[1].replace(/^https?:\/\/[^/]+/, "");
assert(fs.existsSync(`${LARAVEL}/public${fotoFile}`), `file foto ada di server`);

await page.goto(`${BASE}/pohon/${TREE_A}`, { waitUntil: "networkidle" });
assert(
  (await page.locator("text=Galeri Pohon").count()) > 0,
  "detail pohon publik menampilkan galeri",
);

await adminPage.goto(
  `${BASE}/admin/pohon/${encodeURIComponent(TREE_A)}/galeri`,
  { waitUntil: "networkidle" },
);
// Target form foto uji via hidden id (pohon boleh punya foto galeri lama).
await adminPage
  .locator(`form:has(input[type=hidden][value="${fotoUrl[0]}"]) button:has-text('Hapus')`)
  .click();
await adminPage.waitForURL(/hapus=1|error=/, { timeout: 20000 });
await waitForDb(() => {
  const c = rows(`SELECT COUNT(*) FROM imagepohon WHERE id=${fotoUrl[0]}`)[0][0];
  return c === "0" ? "gone" : null;
}, 15000, "hapus imagepohon");
assert(true, "foto galeri terhapus (kondisi awal dipulihkan)");

// ===== #5: laporan dana per desa (baca-saja) =====
const [desaId, desaNama, jmlDesa] = rows(
  "SELECT d.id, d.nama, COUNT(a.id) c FROM desa d JOIN data_adopsi a ON a.desa=d.nama WHERE a.proses IN (1,2,3) GROUP BY d.id, d.nama ORDER BY c DESC LIMIT 1",
)[0];
const danaDb = rows(
  `SELECT COALESCE(SUM(price),0) FROM data_adopsi WHERE proses=3 AND desa='${desaNama}'`,
)[0][0];
await adminPage.goto(`${BASE}/admin/keuangan/desa`, { waitUntil: "networkidle" });
await adminPage
  .locator(`a[href="/admin/keuangan/desa?d=${desaId}"]`)
  .first()
  .click();
await adminPage.waitForURL(/keuangan\/desa\?d=/, { timeout: 20000 });
await adminPage.waitForSelector("table", { timeout: 15000 });
const nRows = await adminPage.locator("tbody tr").count();
assert(
  nRows === Number(jmlDesa),
  `laporan desa ${desaNama}: ${nRows} baris (DB ${jmlDesa})`,
);
const laporan = await adminPage.textContent("main");
const danaShown = (laporan.match(/Rp\s?([\d.]+)/g) || [])
  .map((s) => Number(s.replace(/\D/g, "")))
  .includes(Number(danaDb));
assert(danaShown, `dana terverifikasi ${fmt(Number(danaDb))} tampil`);

await browser.close();
console.log("\n=== SEMUA 9 FITUR GAP LULUS E2E ===");
