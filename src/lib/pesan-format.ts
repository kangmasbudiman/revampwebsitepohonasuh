// Util format notifikasi (pesan_notif) dua bahasa. Teks pesan disimpan di
// backend dalam dua kolom (pesan = Indonesia, pesan_en bila ada); tanggal
// dikirim sebagai created_at mentah agar web memformatnya per locale.
import type { Locale } from "@/lib/i18n";

const BULAN: Record<Locale, string[]> = {
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

// Mendukung bulan singkat kedua bahasa — `tanggal` lama bisa Inggris (baris
// pra-locale) maupun Indonesia.
const NOMOR_BULAN: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, Jun: 5, Jul: 6, Sep: 8, Nov: 10,
  May: 4, Aug: 7, Oct: 9, Dec: 11,
  Mei: 4, Agu: 7, Okt: 9, Des: 11,
};

export function parseIsoPesan(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseTanggalPesan(tanggal: string | null | undefined): Date | null {
  if (!tanggal) return null;
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}), (\d{2}):(\d{2})$/.exec(tanggal);
  if (!m || !(m[2] in NOMOR_BULAN)) return null;
  return new Date(+m[3], NOMOR_BULAN[m[2]], +m[1], +m[4], +m[5]);
}

export function formatTanggalPesan(d: Date, locale: Locale): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${BULAN[locale][d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

// Fallback teks Indonesia bila terjemahan kosong — pesan tulisan admin
// bebas tidak punya versi Inggris.
export function teksPesan(
  pesan: string,
  pesanEn: string | null | undefined,
  locale: Locale,
): string {
  return locale === "en" && pesanEn ? pesanEn : pesan;
}
