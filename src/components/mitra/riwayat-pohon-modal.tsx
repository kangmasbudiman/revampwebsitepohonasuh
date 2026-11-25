"use client";

import { useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import type { OrderTreeMini } from "@/lib/api";
import { namaDesa } from "@/lib/format";

// Kolom "Pohon" di Riwayat — ringkas di tabel, klik untuk melihat semua
// pohon (bisa ratusan) + penanda pohon yang sudah diadopsi.
export default function RiwayatPohonModal({
  trees,
  adoptedCodes,
}: {
  trees: OrderTreeMini[];
  adoptedCodes: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const adopted = new Set(adoptedCodes.map((c) => String(c).toUpperCase()));
  const filtered = trees.filter((t) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [t.code, t.localName, t.species ?? "", t.desa ?? ""].join(" ").toLowerCase().includes(needle);
  });

  if (trees.length === 0) return <span className="text-[11px] text-zinc-400">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => { setQ(""); setOpen(true); }}
        className="flex flex-wrap items-center gap-1 text-left"
        title="Lihat semua pohon pesanan"
      >
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
          {trees.length} pohon
        </span>
        {trees.slice(0, 4).map((t) => {
          const isAdopted = adopted.has(String(t.code).toUpperCase());
          return (
            <span
              key={t.code}
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 font-mono text-[10px] font-semibold ${
                isAdopted
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 dark:bg-night-800 dark:text-emerald-300"
              }`}
              title={isAdopted ? `${t.code} — sudah diadopsi` : t.code}
            >
              {isAdopted && <CheckCircle2 className="h-3 w-3" aria-hidden />}
              {t.code}
            </span>
          );
        })}
        {trees.length > 4 && (
          <span className="rounded-full border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
            +{trees.length - 4} lihat semua
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Daftar pohon pesanan">
          <button type="button" className="absolute inset-0 cursor-default bg-black/55" onClick={() => setOpen(false)} aria-label="Tutup popup" />
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-night-900">
            <div className="border-b border-emerald-100 px-5 py-4 dark:border-night-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100">Daftar Pohon Pesanan</h3>
                  <p className="text-xs text-zinc-500">
                    Total <strong>{trees.length}</strong> pohon · <span className="font-semibold text-emerald-700">{adopted.size} sudah diadopsi</span>
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-night-800" aria-label="Tutup">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <label className="relative mt-3 block">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari kode / nama / desa pohon…"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="min-h-[160px] flex-1 overflow-y-auto px-5 py-4">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">Tidak ada pohon cocok.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filtered.map((t) => {
                    const isAdopted = adopted.has(String(t.code).toUpperCase());
                    return (
                      <div key={t.code} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${isAdopted ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-zinc-200 dark:border-night-700"}`}>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isAdopted ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-night-800"}`}>
                          {isAdopted ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : "🌳"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-emerald-950 dark:text-emerald-100">{t.localName ?? "Pohon"}</span>
                          <span className="block font-mono text-[10px] text-zinc-500">{t.code} · {namaDesa(t.desa ?? "")}</span>
                          {t.adopters && t.adopters.length > 0 && (
                            <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Diadopsi: {t.adopters.join(", ")}
                            </span>
                          )}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${isAdopted ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-700"}`}>
                          {isAdopted ? "Sudah diadopsi" : "Dipesan"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-emerald-100 px-5 py-4 text-right dark:border-night-700">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 dark:border-night-700 dark:text-zinc-300">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
