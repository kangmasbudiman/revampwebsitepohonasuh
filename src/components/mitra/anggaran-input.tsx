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

const PRICE_BADGE: Record<number, string> = {
  100000: "bg-emerald-100 text-emerald-800",
  150000: "bg-amber-100 text-amber-800",
  200000: "bg-blue-100 text-blue-800",
};

type Props = {
  name: string;
  initialEntries?: { harga: number; qty: number }[]; // rincian yang sudah disimpan (mode edit)
};

// Panel Rincian Anggaran Pohon — layout flex yang ikut menyusut agar tidak
// bertumpukan di kolom sempit (mis. popup edit program).
export default function AnggaranInput({ name, initialEntries = [] }: Props) {
  const [rows, setRows] = useState<Tier[]>(() =>
    DEFAULT_TIERS.map((t) => {
      const saved = initialEntries.find((e) => e.harga === t.price);
      return { ...t, qty: saved?.qty ?? 0 };
    }),
  );

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

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-night-700 dark:bg-emerald-950/20">
      {/* Header panel */}
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <Coins className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            Rincian Anggaran Pohon
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Pilih harga pohon dan masukkan jumlahnya. Total anggaran dihitung otomatis.
          </p>
        </div>
      </div>

      {/* Kartu putih */}
      <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-night-700 dark:bg-night-900">
        {/* Header kolom — sejajar dengan baris (checkbox | harga | jumlah | subtotal | hapus) */}
        <div className="mb-2 flex items-center gap-2 border-b border-emerald-100 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-night-700 dark:text-zinc-400">
          <span className="w-4 shrink-0" />
          <span className="min-w-0 flex-1">Harga Pohon</span>
          <span className="w-16 shrink-0 text-center">Jumlah</span>
          <span className="w-20 shrink-0 text-right">Subtotal</span>
          <span className="w-6 shrink-0" />
        </div>

        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={r.price} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={() => toggle(i)}
                className="h-4 w-4 shrink-0 cursor-pointer rounded accent-emerald-600"
                aria-label={`Aktifkan kategori ${rupiah(r.price)}`}
              />
              <span
                className={`min-w-0 flex-1 truncate rounded-xl px-2 py-1 text-[11px] font-bold ${
                  PRICE_BADGE[r.price] ?? "bg-emerald-100 text-emerald-800"
                }`}
                title={`${rupiah(r.price)} / pohon`}
              >
                {rupiah(r.price)} / pohon
              </span>
              <input
                type="number"
                min={0}
                value={r.qty}
                disabled={!r.enabled}
                onChange={(e) => setQty(i, e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-16 shrink-0 rounded-lg border border-zinc-200 bg-white px-1.5 py-1 text-sm font-semibold text-zinc-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                aria-label={`Jumlah pohon ${rupiah(r.price)}`}
              />
              <span className="w-20 shrink-0 truncate text-right text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                {rupiah(r.price * r.qty)}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="w-6 shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
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
            className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Tambah kategori
          </button>
        )}

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-emerald-100 pt-2.5 dark:border-night-700">
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">Total Pohon:</span>
          <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
            {totalQty}
          </span>
        </div>
      </div>

      {/* Footer panel */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-100/80 px-3 py-2.5 dark:bg-emerald-900/30">
        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
          Total Budget Program
        </span>
        <span className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-900/20">
          {rupiah(totalBudget)}
        </span>
      </div>

      <input type="hidden" name={name} value={totalBudget} />
      <input
        type="hidden"
        name="budget_detail"
        value={JSON.stringify(active.filter((r) => r.qty > 0).map((r) => ({ harga: r.price, qty: r.qty })))}
      />
    </div>
  );
}
