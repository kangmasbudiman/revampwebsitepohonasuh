"use client";

import { useSyncExternalStore } from "react";
import type { ApiOrderRow } from "@/lib/api";
import {
  papanSnapshot,
  subscribePapan,
  togglePapan,
} from "@/lib/papan-selection";

// Checkbox "conteng" pada kartu order — menandai pohon yang papan taging-nya
// akan diunduh sekaligus lewat PapanBatchBar.
export default function PapanCheck({ order }: { order: ApiOrderRow }) {
  const sel = useSyncExternalStore(subscribePapan, papanSnapshot, papanSnapshot);
  const checked = sel.has(order.id);
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        checked
          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => togglePapan(order)}
        aria-label={`Tandai papan ${order.idpohon}`}
        className="h-3.5 w-3.5 accent-emerald-600"
      />
      Papan
    </label>
  );
}
