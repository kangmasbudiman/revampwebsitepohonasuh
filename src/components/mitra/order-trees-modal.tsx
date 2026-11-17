"use client";

import { useState } from "react";
import Image from "next/image";
import { X, TreePine } from "lucide-react";
import { namaDesa } from "@/lib/format";
import type { OrderTreeMini } from "@/lib/api";

export default function OrderTreesModal({
  trees,
  statusLabel,
}: {
  trees: OrderTreeMini[];
  statusLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  if (trees.length === 0) {
    return <span className="text-xs text-zinc-400">—</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-night-700 dark:bg-night-800 dark:text-emerald-300"
        aria-label={`Lihat ${trees.length} pohon`}
      >
        <TreePine className="h-3.5 w-3.5" aria-hidden />
        {trees.length} pohon
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Pohon dalam pesanan">
          <button type="button" className="absolute inset-0 cursor-default bg-black/55" onClick={() => setOpen(false)} aria-label="Tutup" />
          <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-night-900">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
              <div>
                <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Pohon dalam Pesanan</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{trees.length} pohon{statusLabel ? ` · ${statusLabel}` : ""}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-night-800 dark:hover:text-zinc-200" aria-label="Tutup">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
              {trees.map((t) => (
                <div key={t.code} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5 dark:border-night-700 dark:bg-night-800/50">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-100 dark:bg-night-900">
                    {t.photoUrl ? (
                      <Image src={t.photoUrl} alt={t.localName} fill sizes="64px" className="object-cover" />
                    ) : (
                      <TreePine className="absolute inset-0 m-auto h-7 w-7 text-emerald-400" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-emerald-950 dark:text-emerald-100">{t.localName}</span>
                      <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-800 dark:bg-night-700 dark:text-emerald-300">{t.code}</span>
                    </p>
                    {t.species && <p className="truncate text-[10px] italic text-zinc-500 dark:text-zinc-400">{t.species}</p>}
                    <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      {t.desa ? namaDesa(t.desa) : "—"}
                      {t.diameterCm != null && <> · Ø {t.diameterCm} cm</>}
                      {t.heightM != null && <> · T {t.heightM} m</>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
