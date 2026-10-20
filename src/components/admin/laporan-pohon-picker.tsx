"use client";

import { useMemo, useState } from "react";
import { Search, SquareCheck, TreePine } from "lucide-react";
import type { ApiKandidatPohon } from "@/lib/api";

export type KandidatPohon = ApiKandidatPohon;

// Pemilih pohon untuk Laporan Kegiatan jenis tagging — kandidat = order
// adopsi terverifikasi dalam desa ampu petugas (dari menu Order Tagging);
// pohon ditentukan SEBELUM pemasangan banner, chip status menunjukkan
// apakah foto tagging per kode pohon sudah diunggah.
export default function LaporanPohonPicker({
  kandidat,
  terpilih,
  onChange,
  disabled = false,
}: {
  kandidat: KandidatPohon[];
  terpilih: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [desa, setDesa] = useState("");

  const desaOptions = useMemo(() => {
    const s = new Set<string>();
    for (const k of kandidat) if (k.desa) s.add(k.desa);
    return [...s].sort();
  }, [kandidat]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return kandidat.filter((k) => {
      if (desa && k.desa !== desa) return false;
      if (!needle) return true;
      return [k.idpohon, k.localname, k.desa, k.donatur]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [kandidat, q, desa]);

  const terpilihSet = useMemo(() => new Set(terpilih), [terpilih]);
  const toggle = (id: number) => {
    if (disabled) return;
    onChange(terpilihSet.has(id) ? terpilih.filter((v) => v !== id) : [...terpilih, id]);
  };

  const inputClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            aria-label="Cari pohon"
            placeholder="Cari kode / nama pohon / donatur…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          aria-label="Filter desa"
          value={desa}
          onChange={(e) => setDesa(e.target.value)}
          className={`${inputClass} sm:w-52`}
        >
          <option value="">Semua desa</option>
          {desaOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400" data-testid="picker-info">
        {kandidat.length} pohon · {kandidat.filter((k) => k.jmlFoto > 0).length} sudah difoto ·{" "}
        {filtered.length} tampil
      </p>

      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-200 dark:border-night-700">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tidak ada pohon yang cocok.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-night-800">
            {filtered.map((k) => {
              const aktif = terpilihSet.has(k.idadopsi);
              return (
                <li key={k.idadopsi}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      aktif
                        ? "bg-emerald-50 dark:bg-emerald-950/40"
                        : "hover:bg-zinc-50 dark:hover:bg-night-800/60"
                    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={aktif}
                      disabled={disabled}
                      onChange={() => toggle(k.idadopsi)}
                      className="h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <TreePine className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                        {k.idpohon}
                      </span>
                      <span className="ml-2 text-zinc-600 dark:text-zinc-300">{k.localname}</span>
                      <span className="block text-xs text-zinc-400">
                        {[k.desa, k.donatur && `donatur: ${k.donatur}`, k.tglTagging]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        k.jmlFoto > 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {k.jmlFoto > 0 ? `${k.jmlFoto} foto` : "belum difoto"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          data-testid="picker-terpilih"
        >
          <SquareCheck className="h-3.5 w-3.5" />
          {terpilih.length} pohon dipilih
        </p>
        {terpilih.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Kosongkan pilihan
          </button>
        )}
      </div>
    </div>
  );
}
