"use client";

import { CalendarDays, Plus, Trash2 } from "lucide-react";

// Editor timeline catatan kegiatan per hari. Serialisasi tetap teks baris
// "DD NamaBulan: teks" (format lembar BTOR) agar backend dan PDF tidak
// berubah bentuk datanya.
export type CatatanEntri = { tanggal: string; teks: string };

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const noBulan = (nama: string): number => {
  const n = nama.toLowerCase();
  return BULAN.findIndex((b) => b.toLowerCase().startsWith(n.slice(0, 3))) + 1;
};

const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// "08 April:", "2026-04-08:", "08/04:" → tanggal ISO; tahun tanpa angka
// diambil dari tahunDefault (tanggal laporan).
function parseTanggal(prefix: string, tahunDefault: number): string | null {
  let m = prefix.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = prefix.match(/^(\d{1,2})[ ./-](\d{1,2})$/);
  if (m) return iso(tahunDefault, Number(m[2]), Number(m[1]));
  m = prefix.match(/^(\d{1,2})[ ./-]([A-Za-z]+)$/);
  if (m) {
    const b = noBulan(m[2]);
    return b ? iso(tahunDefault, b, Number(m[1])) : null;
  }
  return null;
}

export function parseIsi(isi: string, tahunDefault: number): CatatanEntri[] {
  const entri: CatatanEntri[] = [];
  for (const baris of isi.replace(/\r\n?/g, "\n").split("\n")) {
    const m = baris.match(/^(\d{1,2}[ ./-][A-Za-z]+|\d{1,2}[ ./-]\d{1,2}|\d{4}-\d{2}-\d{2})\s*[:-]\s*/);
    const tanggal = m ? parseTanggal(m[1], tahunDefault) : null;
    if (m && tanggal) {
      entri.push({ tanggal, teks: baris.slice(m[0].length) });
    } else if (entri.length) {
      entri[entri.length - 1].teks += `\n${baris}`;
    } else {
      entri.push({ tanggal: "", teks: baris });
    }
  }
  return entri.filter((e) => e.tanggal || e.teks.trim());
}

const urutkan = (entri: CatatanEntri[]): CatatanEntri[] =>
  [...entri].sort((a, b) => {
    if (a.tanggal && b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    if (a.tanggal) return -1;
    if (b.tanggal) return 1;
    return 0;
  });

export function serializeEntri(entri: CatatanEntri[]): string {
  return urutkan(entri)
    .map((e) => {
      if (!e.tanggal) return e.teks;
      const [y, m, d] = e.tanggal.split("-").map(Number);
      return `${String(d).padStart(2, "0")} ${BULAN[m - 1]}: ${e.teks}`;
    })
    .filter((s) => s.trim())
    .join("\n");
}

const labelEntri = (e: CatatanEntri): string => {
  if (!e.tanggal) return "Tanpa tanggal";
  const [, m, d] = e.tanggal.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${BULAN[m - 1]}`;
};

export default function BtorCatatanEditor({
  value,
  onChange,
  maxTotal = 10000,
}: {
  value: CatatanEntri[];
  onChange: (entri: CatatanEntri[]) => void;
  maxTotal?: number;
}) {
  const total = serializeEntri(value).length;
  const sisa = maxTotal - total;

  const ubahTeks = (i: number, teksBaru: string) => {
    const lain = serializeEntri(value.filter((_, j) => j !== i)).length;
    const batas = Math.max(0, maxTotal - lain - (value[i].tanggal ? labelEntri(value[i]).length + 2 : 0));
    onChange(value.map((e, j) => (j === i ? { ...e, teks: teksBaru.slice(0, batas) } : e)));
  };

  const tambah = () => onChange(urutkan([...value, { tanggal: "", teks: "" }]));
  const hapus = (i: number) => onChange(value.filter((_, j) => j !== i));

  const inputClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

  return (
    <div>
      {value.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-8 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
          <CalendarDays className="mx-auto h-8 w-8 text-emerald-500 dark:text-emerald-400" />
          <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Catat kegiatan per hari
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Klik <span className="font-semibold">Tambah Hari</span> untuk memulai garis waktu kegiatan.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-emerald-200 pl-8 dark:border-night-700">
          {value.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-emerald-100 dark:ring-night-800">
                <CalendarDays className="h-3 w-3 text-white" />
              </span>
              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-night-700 dark:bg-night-900">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    aria-label={`Tanggal hari ke-${i + 1}`}
                    data-testid={`entri-tanggal-${i}`}
                    value={e.tanggal}
                    onChange={(ev) => onChange(urutkan(value.map((v, j) => (j === i ? { ...v, tanggal: ev.target.value } : v))))}
                    className={`${inputClass} sm:w-44`}
                  />
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    {labelEntri(e)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus hari ke-${i + 1}`}
                    data-testid={`hapus-hari-${i}`}
                    onClick={() => hapus(i)}
                    className="ml-auto rounded-lg border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  maxLength={maxTotal}
                  aria-label={`Catatan hari ke-${i + 1}`}
                  data-testid={`entri-teks-${i}`}
                  value={e.teks}
                  onChange={(ev) => ubahTeks(i, ev.target.value)}
                  placeholder="Apa yang dikerjakan hari ini…"
                  className={`${inputClass} mt-2`}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={tambah}
        data-testid="tambah-hari"
        className="mt-3 w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      >
        <span className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tambah Hari
        </span>
      </button>
      <p
        data-testid="isi-counter"
        className={`mt-1 text-right text-xs ${sisa < 50 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}`}
      >
        {total}/{maxTotal}
      </p>
    </div>
  );
}
