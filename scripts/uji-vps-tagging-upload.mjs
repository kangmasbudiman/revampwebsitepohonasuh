// Smoke test produksi: upload bukti tagging via UI petugas di pohonasuh.io
// untuk order C077 #202610041970 (data_adopsi id 3628, proses=2).
// Foto uji dihapus lagi (row DB + file) — order TIDAK diubah prosesnya.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const assert = (c, m) => {
  if (!c) { console.error("GAGAL:", m); process.exit(1); }
  console.log("OK", m);
};
const vps = (sql) =>
  execSync(`ssh pohonasuh-vps "docker exec pohonasuh-mysql mysql -uroot -p'Pohonassuh2026#' pohonasuh -N -e \\"${sql.replace(/"/g, '\\\\"')}\\" 2>/dev/null"`).toString().trim();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("https://pohonasuh.io/masuk");
await page.fill("#email", "petugastes2026@yahoo.com");
await page.fill("#password", "Petugas1234");
await page.click("button[type=submit]");
await page.waitForURL(/\/admin/, { timeout: 30000 });
assert(true, "login petugas → " + page.url());

await page.goto("https://pohonasuh.io/admin/tagging?proses=2");
const form = page.locator('form:has(input[name="idpohon"][value="C077"])').first();
await form.waitFor({ timeout: 15000 });
assert(true, "kartu order C077 (proses 2) tampil");

await form.locator('input[name="foto"]').setInputFiles({
  name: "uji-tagging.jpg", mimeType: "image/jpeg", buffer: Buffer.from(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzNP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscHRJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4ooooA//9k=",
    "base64"),
});
await form.locator('button[type=submit]:has-text("Unggah")').click();
await page.waitForSelector("text=Foto tagging terunggah.", { timeout: 30000 });
assert(true, "pesan sukses 'Foto tagging terunggah.' tampil (tidak ada 500)");

await page.screenshot({ path: "/tmp/uji-tagging-upload.png", fullPage: true });

const rows = vps("SELECT id,urlGambar FROM foto_tagging WHERE idadopsi=3628").split("\n").filter(Boolean);
assert(rows.length === 1, `row DB tersimpan: ${rows.join(" | ")}`);
const [id, url] = rows[0].split("\t");
const http = await fetch(url === undefined ? "" : url.replace(/^"|"$/g, ""));
assert(http.status === 200 && (http.headers.get("content-type") ?? "").includes("image/"), `file tersaji via URL (${http.status})`);

// cleanup: row + file (order dibiarkan proses=2)
vps(`DELETE FROM foto_tagging WHERE id=${id}`);
const namaFile = url.split("/").pop().replace(/"/g, "");
execSync(`ssh pohonasuh-vps "rm -f /var/www/apps/pohonasuh/rest-api-pohonasuh/public/upload/taging/${namaFile}"`);
const sisa = vps("SELECT COUNT(*) FROM foto_tagging WHERE idadopsi=3628");
assert(sisa === "0", "cleanup: row uji dihapus");

await browser.close();
console.log("\n=== SMOKE TEST UPLOAD TAGGING PRODUKSI LULUS ===");
