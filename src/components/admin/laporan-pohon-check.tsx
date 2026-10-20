"use client";

import { useSyncExternalStore } from "react";
import type { ApiOrderRow } from "@/lib/api";
import {
  laporanPohonSnapshot,
  subscribeLaporan,
  toggleLaporanPohon,
} from "@/lib/laporan-selection";

// Checkbox pada kartu order — menandai pohon yang akan dimasukkan ke
// Laporan Kegiatan (daftar pohon akan ditagging) lewat LaporanBatchBar.
export default function LaporanPohonCheck({ order }: { order: ApiOrderRow }) {
  const sel = useSyncExternalStore(subscribeLaporan, laporanPohonSnapshot, laporanPohonSnapshot);
  const checked = sel.has(order.id);
  return (
    <label
      data-testid="check-laporan"
      className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        checked
          ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-300"
          : "border-teal-200 text-teal-800 hover:bg-teal-50 dark:border-night-700 dark:text-teal-300 dark:hover:bg-night-800"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleLaporanPohon(order)}
        aria-label={`Tandai pohon ${order.idpohon} untuk laporan kegiatan`}
        className="h-3.5 w-3.5 accent-teal-600"
      />
      Laporan
    </label>
  );
}
