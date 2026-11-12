// Skema/Institusi hutan bilingual untuk lembar sertifikat.
//
// Satu kolom di master Data Lokasi menyimpan satu nilai, tetapi sertifikat
// punya versi Indonesia & Inggris. Nilai yang dikenali (daftar baku di
// bawah) otomatis ditampilkan sesuai bahasa lembar — admin bebas mengetik
// sisi Indonesia atau Inggris, hasil terjemahannya tetap dinamis. Nilai
// di luar daftar tampil apa adanya di kedua bahasa.

export type SkemaPair = { id: string; en: string };

const SKEMA_PAIRS: Record<string, SkemaPair> = {
  "hutan tanaman rakyat & hutan kemasyarakatan": {
    id: "Hutan Tanaman Rakyat & Hutan Kemasyarakatan",
    en: "Community Timber Plantation & Community Forest",
  },
  "community timber plantation & community forest": {
    id: "Hutan Tanaman Rakyat & Hutan Kemasyarakatan",
    en: "Community Timber Plantation & Community Forest",
  },
  "hutan desa": { id: "Hutan Desa", en: "Village Forest" },
  "hutan nagari": { id: "Hutan Nagari", en: "Village Forest" }, // khusus Sumbar
  "customary forest": { id: "Hutan Adat", en: "Customary Forest" },
  "hutan adat": { id: "Hutan Adat", en: "Customary Forest" },
  // nilai lama yang sudah terpakai di master data
  "customary forest/ha": { id: "Hutan Adat/HA", en: "Customary Forest/HA" },
  "hutan adat/ha": { id: "Hutan Adat/HA", en: "Customary Forest/HA" },
  "hutan kemasyarakatan": {
    id: "Hutan Kemasyarakatan",
    en: "Community Forest",
  },
};

// Kunci pencarian: kecilkan huruf, buang isi kurung ("Hutan Desa (Village
// Forest)" ≡ "Hutan Desa"), samakan "dan" dengan "&", rapikan spasi.
function kunciSkema(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\bdan\b/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Istilah skema untuk lembar sertifikat sesuai bahasa. `nagari` = desa di
// Sumatera Barat (unitnya Nagari) — dipakai untuk nilai kosong dan untuk
// "Village Forest" yang ambigu (Hutan Nagari di Sumbar, Hutan Desa di
// provinsi lain).
export function skemaSertifikat(
  raw: string | null | undefined,
  lang: "id" | "en",
  nagari: boolean,
): string {
  const skema = (raw ?? "").trim();
  const key = kunciSkema(skema);
  if (key === "village forest") {
    return lang === "id" ? (nagari ? "Hutan Nagari" : "Hutan Desa") : "Village Forest";
  }
  const pair = SKEMA_PAIRS[key];
  if (pair) return lang === "id" ? pair.id : pair.en;
  if (!skema) {
    return lang === "id"
      ? `Hutan ${nagari ? "Nagari" : "Desa"}`
      : `${nagari ? "Nagari" : "Village"} Forest`;
  }
  return skema; // nilai bebas — tampil apa adanya
}

// Opsi datalist pada form Data Lokasi (nilai baku + varian lama agar data
// lama tetap cocok dengan pemetaan di atas).
export const SKEMA_PILIHAN = [
  "Hutan Tanaman Rakyat & Hutan Kemasyarakatan",
  "Hutan Desa",
  "Hutan Nagari",
  "Hutan Adat",
  "Hutan Adat/HA",
  "Village Forest",
  "Customary Forest",
  "Customary Forest/HA",
];
