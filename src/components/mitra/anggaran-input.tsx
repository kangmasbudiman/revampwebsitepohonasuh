"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";

// Kategori harga pohon yang tersedia — untuk perhitungan di "Rincian
// Anggaran Pohon" (subtotal = harga × jumlah pohon per kategori).
const PRICE_TIERS = [100000, 150000, 200000];

type Props = {
  name: string; // nama field budget (hidden, isi = total)
  initialEntries?: number[]; // qty per kategori (urutan sama PRICE_TIERS)
};

// Rincian Anggaran Pohon — Mitra pilih kategori harga pohon (Rp100.000,
// Rp150.000, Rp200.000) + jumlah pohon tiap kategori; sistem hitung subtotal
// per kategori dan Total Budget Program otomatis.
export default function AnggaranInput({ name, initialEntries = [] }: Props) {
  const [entries, setEntries] = useState<number[]>(() =>
    PRICE_TIERS.map((_, i) => initialEntries[i] ?? 0),
  );

  const setQty = (i: number, v: number) => {
    setEntries((prev) => prev.map((q, idx) => (idx === i ? v : q)));
  };

  const totalQty = entries.reduce((s, q) => s + q, 0);
  const totalBudget = PRICE_TIERS.reduce((s, t, i) => s + t * (entries[i] ?? 0), 0);

  return (
    <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 overflow-hidden dark:border-night-700 dark:bg-night-800/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        Rincian Anggaran Pohon
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {PRICE_TIERS.map((t, i) => {
          const sub = t * (entries[i] ?? 0);
          return (
            <div key={t} className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 rounded-lg border border-emerald-100 bg-white px-3.5 py-3 dark:border-night-700">
              <span className="truncate text-sm font-semibold text-emerald-700 dark:text-emerald-300">{rupiah(t)}</span>
              <input
                type="number"
                min={0}
                value={entries[i] ?? 0}
                onChange={(e) => setQty(i, e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-20 shrink-0 rounded-lg border border-emerald-100 bg-white px-2 py-1.5 text-sm font-semibold text-emerald-800 dark:border-night-700 dark:bg-night-950 dark:text-emerald-200"
                aria-label={`Jumlah pohon di kategori ${rupiah(t)}`}
              />
              <span className="w-28 shrink-0 text-right font-semibold truncate text-emerald-700 dark:text-emerald-300">{rupiah(sub)}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2.5 border-t border-emerald-100 pt-4 dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Jumlah pohon (total)</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 dark:border-night-700 dark:bg-night-800 dark:text-emerald-300 dark:hover:bg-night-700">
            {totalQty}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5">
          <span className="text-sm font-semibold text-emerald-700">Total Budget Program</span>
          <span className="rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-500 to-teal-500 px-6 py-3 text-lg font-extrabold text-white shadow-lg shadow-emerald-900/30">
            {rupiah(totalBudget)}
          </span>
        </div>
      </div>

      <input type="hidden" name={name} value={totalBudget} />
    </div>
  );
}
