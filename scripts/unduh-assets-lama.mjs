// Migrasi gambar hosting lama → mirror lokal (untuk disalin ke VPS saat deploy).
// Daftar URL diambil persis dari DB (union 3 tabel penunjuk pohonasuh.org),
// tanpa crawling. Resumable: file >0 byte yang sudah ada dilewati.
// Jalankan: node scripts/unduh-assets-lama.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TARGET = "/Users/admin/development/assets-mirror-pohonasuh";
const ASAL = "https://pohonasuh.org/";

const rows = (sql) =>
  execSync(
    `mysql -uroot -pkerabatkotak pohonasuh2 -N -B -e "${sql.replace(/"/g, '\\"')}" 2>/dev/null`,
  )
    .toString()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const urls = [
  ...new Set([
    ...rows("SELECT foto_pohon FROM data_pohon WHERE foto_pohon LIKE 'https://pohonasuh.org/%'"),
    ...rows("SELECT urlnya FROM imagepohon WHERE urlnya LIKE 'https://pohonasuh.org/%'"),
    ...rows("SELECT foto FROM species_catalog WHERE foto LIKE 'https://pohonasuh.org/%'"),
  ]),
];
console.log(`${urls.length} URL unik dari DB`);

let ok = 0,
  skip = 0;
const gagal = [];
const antri = [...urls];
let selesai = 0;

async function pekerja() {
  while (antri.length) {
    const url = antri.pop();
    const dest = path.join(TARGET, url.slice(ASAL.length));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      skip++;
    } else {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
        ok++;
      } catch (e) {
        gagal.push(`${url} — ${e.message}`);
      }
    }
    selesai++;
    if (selesai % 250 === 0)
      console.log(`… ${selesai}/${urls.length} (unduh ${ok}, lewati ${skip}, gagal ${gagal.length})`);
  }
}

await Promise.all(Array.from({ length: 6 }, pekerja));
fs.writeFileSync("/tmp/assets-mirror-gagal.txt", gagal.join("\n"));
console.log(
  `SELESAI: ${ok} diunduh, ${skip} sudah ada, ${gagal.length} gagal (daftar: /tmp/assets-mirror-gagal.txt)`,
);
