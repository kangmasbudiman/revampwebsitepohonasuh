"use client";

import { useState } from "react";
import { Coins, Plus, Trash2 } from "lucide-react";
import { rupiah } from "@/lib/format";

type Tier = { price: number; qty: number; enabled: boolean };

const DEFAULT_TIERS: Tier[] = [
  { price: 100000, qty: 0, enabled: true },
  { price: 150000, qty: 0, enabled: true },
  { price: 200000, qty: 0, enabled: true },
];

// Warna badge per kategori harga: hijau muda / kuning muda / biru muda.
const PRICE_BADGE: Record<number, string> = {
  100000: "bg-emerald-100 text-emerald-800",
  150000: "bg-amber-100 text-amber-800",
  200000: "bg-blue-100 text-blue-800",
};

type Props = {
  name: string; // field hidden budget = total anggaran
};

// Panel Rincian Anggaran Pohon — pilih harga pohon, isi jumlah,
// subtotal & total dihitung real-time (baris nonaktif tidak dihitung).
export default function AnggaranInput({ name }: Props) {
  const [rows, setRows] = useState<Tier[]>(() => DEFAULT_TIERS.map((t) => ({ ...t })));

  const setQty = (i: number, v: number) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, qty: v } : r)));
  const toggle = (i: number) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, enabled: !r.enabled } : r)));
  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const restore = () =>
    setRows((prev) => {
      const existing = new Set(prev.map((r) => r.price));
      return [...DEFAULT_TIERS.filter((t) => !existing.has(t.price)).map((t) => ({ ...t })), ...prev].sort(
        (a, b) => a.price - b.price,
      );
    });

  const active = rows.filter((r) => r.enabled);
  const totalQty = active.reduce((s, r) => s + r.qty, 0);
  const totalBudget = active.reduce((s, r) => s + r.price * r.qty, 0);

  const gridCols = "grid grid-cols-[auto_minmax(0,1fr)_92px_116px_auto] items-center gap-3";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-night-700 dark:bg-emerald-950/20">
      {/* Header panel */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <Coins className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
            Rincian Anggaran Pohon
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Pilih harga pohon dan masukkan jumlahnya. Total anggaran dihitung otomatis.
          </p>
        </div>
      </div>

      {/* Kartu putih berisi tabel */}
      <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-night-700 dark:bg-night-900">
        <div className={`${gridCols} mb-2 border-b border-emerald-100 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-night-700 dark:text-zinc-400`}>
          <span />
          <span>Harga Pohon</span>
          <span>Jumlah Pohon</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.price} className={`${gridCols} rounded-xl px-1 py-2`}>
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={() => toggle(i)}
                className="h-4 w-4 cursor-pointer rounded accent-emerald-600"
                aria-label={`Aktifkan kategori ${rupiah(r.price)}`}
              />
              <span
                className={`w-fit truncate rounded-xl px-2.5 py-1 text-xs font-bold ${
                  PRICE_BADGE[r.price] ?? "bg-emerald-100 text-emerald-800"
                }`}
              >
                {rupiah(r.price)} / pohon
              </span>
              <input
                type="number"
                min={0}
                value={r.qty}
                disabled={!r.enabled}
                onChange={(e) => setQty(i, e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-[92px] rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-[15px] font-semibold text-zinc-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:ring-emerald-900/40"
                aria-label={`Jumlah pohon ${rupiah(r.price)}`}
              />
              <span className="truncate text-right text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {rupiah(r.price * r.qty)}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                aria-label={`Hapus kategori ${rupiah(r.price)}`}
                title="Hapus baris"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="py-4 text-center text-xs text-zinc-500">Belum ada kategori harga pohon.</p>
          )}
        </div>

        {rows.length < DEFAULT_TIERS.length && (
          <button
            type="button"
            onClick={restore}
            className="mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Tambah kategori
          </button>
        )}

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-emerald-100 pt-3 dark:border-night-700">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Total Pohon:</span>
          <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
            {totalQty}
          </span>
        </div>
      </div>

      {/* Footer panel */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-100/80 px-4 py-3 dark:bg-emerald-900/30">
        <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
          Total Budget Program
        </span>
        <span className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20">
          {rupiah(totalBudget)}
        </span>
      </div>

      <input type="hidden" name={name} value={totalBudget} />
    </div>
  );
}
