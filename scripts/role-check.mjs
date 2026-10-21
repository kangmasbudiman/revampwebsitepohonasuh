// E2E fitur Kelola Role & Izin: role ber-izin "memo" bisa menerbitkan memo +
// update pencairan pada laporan ORANG LAIN yang sudah diverifikasi, petugas
// tanpa izin tetap tidak bisa, admin tetap superuser.
// Jalankan: API_BASE_URL=http://127.0.0.1:8001/api E2E_BASE=http://localhost:3001 node scripts/role-check.mjs
import { chromium } from "playwright";
import { SignJWT } from "jose";
import fs from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const API = process.env.API_BASE_URL ?? "http://127.0.0.1:8001/api";
const PREFIX = "E2E Role";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const apiPost = async (path, data = {}) => {
  await sleep(250); // jaga throttle Laravel
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
  });
  return res.json();
};
const apiGet = async (path) => {
  await sleep(250);
  return (await fetch(`${API}/${path}`)).json();
};

// ===== 0. Cleanup sisa run gagal =====
for (const r of await apiGet("rolelist")) {
  if (String(r.nama).startsWith(PREFIX)) await apiPost("hapusrole", { id: r.id });
}
for (const l of await apiGet("laporanlist")) {
  if (String(l.judul).startsWith(PREFIX)) await apiPost("hapuslaporan", { id: l.id });
}

// ===== 1. Buat role ber-izin memo + tempel ke petugas 2683 (via API) =====
ok("role: tambah via API", (await apiPost("tambahrole", { nama: `${PREFIX} Memo`, "izin[]": "memo" })).value === "200");
const roles = await apiGet("rolelist");
const role = roles.find((r) => r.nama === `${PREFIX} Memo`);
ok("role: terlihat di rolelist dengan izin memo", role && JSON.stringify(role.izin) === '["memo"]' && role.jumlah === 0);
ok("role: set ke petugas 2683", (await apiPost("setmemberrole", { idmember: 2683, idrole: role.id })).value === "200");
const loginPetugas = await apiPost("loginuser", { emaile: "petugastes2026@yahoo.com", passe: "Petugas1234", id_token: "e2e" });
ok("login: petugas ber-role mengembalikan hak [memo]", JSON.stringify(loginPetugas.hak) === '["memo"]');

// ===== 2. Halaman /admin/role (admin) =====
const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctxA.addCookies([{ name: "pa_session", value: await signToken({ userId: 2682, name: "Admin Pohon Asuh", role: "ADMIN", level: 1 }), url: BASE }]);
const a = await ctxA.newPage();
await a.goto(`${BASE}/admin/role`, { waitUntil: "networkidle" });
ok("halaman role: menu & halaman terbuka", (await a.locator("h1").textContent()).trim() === "Kelola Role");
ok("halaman role: tabel role menampilkan izin label", (await a.locator('[data-testid="tabel-role"]').textContent()).includes("Terbit Memo & Pencairan"));
const barisStaf = a.locator('[data-testid="tabel-staf"] tr', { hasText: "Petugas Taging" });
ok("halaman role: staf 2683 terlihat ber-role", (await barisStaf.textContent()).includes(`${PREFIX} Memo`));

// Edit role via UI (menguji serialisasi izin[] dari server action form)
await a.click(`[data-testid="edit-role-${role.id}"]`);
await a.fill('[data-testid="role-nama"]', `${PREFIX} Memo 2`);
await a.click('[data-testid="simpan-role"]');
await a.waitForURL(/\?saved=1/, { timeout: 30000 });
await a.goto(`${BASE}/admin/role`, { waitUntil: "networkidle" });
const teksTabel = await a.locator('[data-testid="tabel-role"]').textContent();
ok("halaman role: edit nama via UI tersimpan + izin tetap", teksTabel.includes(`${PREFIX} Memo 2`) && teksTabel.includes("Terbit Memo & Pencairan"));

// Duplikat nama → pesan error inline (muat ulang halaman dulu agar form
// terhidrasi penuh — submit sebelum hydration hanya memuat ulang halaman)
await a.goto(`${BASE}/admin/role`, { waitUntil: "networkidle" });
await a.fill('[data-testid="role-nama"]', `${PREFIX} Memo 2`);
await a.click('[data-testid="simpan-role"]');
await a.waitForSelector('[data-testid="role-error"]', { timeout: 30000 });
ok("halaman role: nama duplikat ditolak", (await a.locator('[data-testid="role-error"]').textContent()).includes("sudah dipakai"));

// ===== 3. Fixture laporan milik ADMIN (bukan milik petugas) → disetujui =====
const HARI = new Date().toISOString().slice(0, 10);
const buat = await apiPost("tambahlaporan", {
  idpetugas: 2682,
  judul: `${PREFIX} Laporan ${Date.now()}`,
  jenis: "lainnya",
  tanggal: HARI,
  isi: `${HARI}: Uji izin memo lintas petugas.`,
  hasil: "Hasil uji role.",
  dana: "275000",
  status: "terkirim",
});
ok("fixture: laporan terkirim dibuat", buat.value === "200" && !!buat.id);
ok("fixture: laporan disetujui admin", (await apiPost("approvelaporan", { id: buat.id, oleh: 2682 })).value === "200");
const ID = Number(buat.id);

// ===== 4. Petugas ber-hak memo (level 2 + hak) =====
const ctxP = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctxP.addCookies([{ name: "pa_session", value: await signToken({ userId: 2683, name: "Petugas Taging", role: "ADMIN", level: 2, hak: ["memo"] }), url: BASE }]);
const p = await ctxP.newPage();
await p.goto(`${BASE}/admin/laporan/${ID}`, { waitUntil: "networkidle" });
ok("ber-hak: bisa buka laporan orang lain yg disetujui", ((await p.locator('[data-testid="detail-status"]').textContent()) ?? "").trim() === "Disetujui");
ok("ber-hak: tombol Verifikasi BTOR TIDAK tampil", (await p.locator('button:has-text("Verifikasi BTOR")').count()) === 0);

await p.click('button[role=tab]:has-text("Memo")');
const memoForm = p.locator('form:has(input[name="ttd_nama"])');
ok("ber-hak: form memo tampil untuk petugas", (await memoForm.count()) === 1);
await memoForm.locator('input[name="ttd_nama"]').fill("Petugas Taging");
await memoForm.locator('input[name="ttd_jabatan"]').fill("Petugas Lapangan");
await memoForm.locator('button:has-text("Terbitkan Memo")').click();
await p.waitForURL(/\?memo=1/, { timeout: 30000 });
await p.click('button[role=tab]:has-text("Memo")');
ok("ber-hak: memo terbit dari tangan petugas", (await p.locator('[data-testid="memo-card"]').textContent()).includes("MEMO/"));
ok("ber-hak: form pencairan tampil", (await p.locator('select[name="status_pencairan"]').count()) === 1);
const stepDone = async (page, n) =>
  page.evaluate((i) => {
    const el = document.querySelector(`[data-testid="stepper-${i}"]`);
    return !!el && (el.className.includes("text-emerald-800") || el.className.includes("text-emerald-300"));
  }, n);
ok("ber-hak: stepper tahap 3 (memo) done", await stepDone(p, 3));

const cairForm = p.locator('form:has(select[name="status_pencairan"])');
await cairForm.locator('select[name="status_pencairan"]').selectOption("dicairkan");
await cairForm.locator('button:has-text("Perbarui")').click();
await p.waitForURL(/\?pencairan=1/, { timeout: 30000 });
await p.click('button[role=tab]:has-text("Memo")');
ok("ber-hak: petugas update pencairan → dicairkan", (await p.locator('[data-testid="memo-status"]').textContent()).includes("Dana dicairkan"));

// ===== 5. Negatif: petugas TANPA hak =====
const ctxN = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctxN.addCookies([{ name: "pa_session", value: await signToken({ userId: 2683, name: "Petugas Taging", role: "ADMIN", level: 2 }), url: BASE }]);
const n = await ctxN.newPage();
const resp = await n.goto(`${BASE}/admin/laporan/${ID}`);
const body404 = (await n.locator("body").textContent()).includes("not be found");
ok("tanpa hak: laporan orang lain → 404", resp.status() === 404 || body404, `status=${resp.status()}`);

// Laporan sendiri yg disetujui: bisa buka, tapi TANPA form memo
const buat2 = await apiPost("tambahlaporan", {
  idpetugas: 2683,
  judul: `${PREFIX} Laporan Sendiri ${Date.now()}`,
  jenis: "lainnya",
  tanggal: HARI,
  isi: `${HARI}: Laporan milik sendiri.`,
  hasil: "Hasil.",
  dana: "150000",
  status: "terkirim",
});
await apiPost("approvelaporan", { id: buat2.id, oleh: 2682 });
await n.goto(`${BASE}/admin/laporan/${buat2.id}`, { waitUntil: "networkidle" });
await n.click('button[role=tab]:has-text("Memo")');
ok("tanpa hak: laporan sendiri terbuka TAPI form memo tidak ada", (await n.locator('form:has(input[name="ttd_nama"])').count()) === 0);

// ===== 6. Hapus role via UI → staf kembali tanpa role =====
await a.goto(`${BASE}/admin/role`, { waitUntil: "networkidle" });
await a.evaluate(() => {
  new MutationObserver(() => {
    document.querySelectorAll("button[data-confirm-submit]").forEach((b) => {
      if (!b.dataset.auto) { b.dataset.auto = "1"; b.click(); }
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
await a.click(`tr:has-text("${PREFIX} Memo 2") form:has(input[name="id"]) button:has-text("Hapus")`);
await a.waitForURL(/\?deleted=1/, { timeout: 30000 });
await a.goto(`${BASE}/admin/role`, { waitUntil: "networkidle" });
// role terakhir terhapus → tabel diganti empty state; cukup pastikan nama role uji hilang
ok("hapus role: role hilang dari halaman", !(await a.locator("main").textContent()).includes(PREFIX));
ok("hapus role: staf 2683 kembali Tanpa role", (await a.locator('[data-testid="tabel-staf"] tr', { hasText: "Petugas Taging" }).textContent()).includes("Tanpa role"));

// ===== 7. Cleanup =====
await apiPost("hapuslaporan", { id: buat.id });
await apiPost("hapuslaporan", { id: buat2.id });
ok("cleanup: 0 laporan uji tersisa", !(await apiGet("laporanlist")).some((l) => String(l.judul).startsWith(PREFIX)));

await browser.close();
console.log(gagal === 0 ? "\n=== E2E KELOLA ROLE & IZIN MEMO LULUS ===" : `\n=== GAGAL: ${gagal} assertion ===`);
process.exit(gagal === 0 ? 0 : 1);
