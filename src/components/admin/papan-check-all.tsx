"use client";

import { useSyncExternalStore } from "react";
import { ListChecks, ListX } from "lucide-react";
import type { ApiOrderRow } from "@/lib/api";
import {
  clearPapanSelection,
  papanSnapshot,
  setPapanSelection,
  subscribePapan,
} from "@/lib/papan-selection";

// Tombol "Conteng Semua / Hilangkan Semua" (khusus petugas): sekali klik
// menandai semua pohon yang akan diproses (belum ditagging) pada tab aktif;
// saat semuanya sudah tercentang, tombol yang sama menghapus seluruh centang.
export default function PapanCheckAll({ orders }: { orders: ApiOrderRow[] }) {
  const sel = useSyncExternalStore(subscribePapan, papanSnapshot, papanSnapshot);
  if (orders.length === 0) return null;
  const semuaTerconteng = orders.every((o) => sel.has(o.id));
  return (
    <button
      type="button"
      onClick={() => (semuaTerconteng ? clearPapanSelection() : setPapanSelection(orders))}
      aria-label={semuaTerconteng ? "Hilangkan semua centang" : "Conteng semua papan"}
      data-testid="conteng-semua"
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
        semuaTerconteng
          ? "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-night-600 dark:bg-night-800 dark:text-zinc-200 dark:hover:bg-night-700"
          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
      }`}
    >
      {semuaTerconteng ? (
        <ListX className="h-4 w-4" />
      ) : (
        <ListChecks className="h-4 w-4" />
      )}
      {semuaTerconteng ? "Hilangkan Semua" : `Conteng Semua (${orders.length})`}
    </button>
  );
}
