"use client";

import { useSyncExternalStore } from "react";
import { ClipboardList, X } from "lucide-react";
import { buatLaporanDariTagging } from "@/lib/actions/laporan";
import {
  clearLaporanSelection,
  laporanPohonSnapshot,
  subscribeLaporan,
} from "@/lib/laporan-selection";

// Bar aksi melayang: buat DRAF Laporan Kegiatan (jenis tagging) berisi
// pohon-pohon yang diconteng "Laporan" — draft menjadi "daftar pohon akan
// ditagging"; foto menyusul per kode pohon di halaman Order Tagging, BTOR
// dilengkapi petugas di form laporan.
export default function LaporanBatchBar() {
  const sel = useSyncExternalStore(subscribeLaporan, laporanPohonSnapshot, laporanPohonSnapshot);
  const list = [...sel.values()];
  if (list.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 print:hidden">
      <form
        action={buatLaporanDariTagging}
        className="pa-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-teal-200 px-4 py-3 shadow-lg dark:border-night-700"
      >
        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
          {list.length} pohon dipilih untuk laporan kegiatan
        </p>
        {list.map((o) => (
          <span key={o.id}>
            <input type="hidden" name="idadopsi[]" value={o.id} />
            <input type="hidden" name="desa[]" value={o.desa} />
          </span>
        ))}
        <button
          type="submit"
          data-testid="buat-laporan-tagging"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#249689] to-[#10791D] px-4 py-2 text-xs font-bold text-white shadow-md transition-opacity hover:opacity-90"
        >
          <ClipboardList className="h-4 w-4" />
          Buat Laporan Kegiatan ({list.length})
        </button>
        <button
          type="button"
          onClick={clearLaporanSelection}
          aria-label="Kosongkan pilihan laporan"
          className="inline-flex items-center gap-1 rounded-full border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 disabled:opacity-60 dark:border-night-700 dark:text-teal-300 dark:hover:bg-night-800"
        >
          <X className="h-3.5 w-3.5" /> Kosongkan
        </button>
      </form>
    </div>
  );
}
