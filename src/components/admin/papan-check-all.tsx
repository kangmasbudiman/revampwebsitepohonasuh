"use client";

import { ListChecks } from "lucide-react";
import type { ApiOrderRow } from "@/lib/api";
import { setPapanSelection } from "@/lib/papan-selection";

// Tombol "Conteng Semua" (khusus petugas): menandai sekaligus semua pohon
// yang akan diproses (belum ditagging) pada tampilan/tab aktif untuk unduh
// massal papan taging.
export default function PapanCheckAll({ orders }: { orders: ApiOrderRow[] }) {
  if (orders.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => setPapanSelection(orders)}
      aria-label="Conteng semua papan"
      data-testid="conteng-semua"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
    >
      <ListChecks className="h-4 w-4" /> Conteng Semua ({orders.length})
    </button>
  );
}
