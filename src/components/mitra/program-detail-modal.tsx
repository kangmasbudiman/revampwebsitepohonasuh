"use client";

import Image from "next/image";
import Link from "next/link";
import { X, CalendarDays, Wallet, MapPin, FileText } from "lucide-react";
import type { ApiProgramMitra } from "@/lib/api";

type Props = {
  program: ApiProgramMitra;
  logoUrl: string | null;
};

function formatBudget(v: number | null | undefined): string {
  const n = v ? Number(v) : 0;
  if (!n || n <= 0) return "—";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatProvinsi(v: string | null | undefined): string {
  const list = String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list.join(", ") : "—";
}

function priceBadge(harga: number): string {
  if (harga === 150000) return "bg-amber-100 text-amber-800";
  if (harga === 200000) return "bg-blue-100 text-blue-800";
  return "bg-emerald-100 text-emerald-800";
}

// Popup (modal) detail program — dibuka lewat ?detail=<id>, ditutup dengan
// kembali ke /mitra/program (tanpa query detail).
export default function ProgramDetailModal({ program, logoUrl }: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail program ${program.nama}`}
    >
      <Link
        href="/mitra/program"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
        aria-label="Tutup detail"
      />

      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-night-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Program #{program.id}
            </p>
            <h3 className="mt-1 truncate text-lg font-extrabold text-emerald-950 dark:text-emerald-100">
              {program.nama}
            </h3>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                program.aktif
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-500 dark:bg-night-800 dark:text-zinc-400"
              }`}
            >
              {program.aktif ? "Aktif" : "Nonaktif"}
            </span>
          </div>
          <Link
            href="/mitra/program"
            className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-night-800 dark:hover:text-zinc-200"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          {logoUrl && (
            <div className="mb-4 flex justify-center">
              <Image
                src={logoUrl}
                alt={`Logo ${program.nama}`}
                width={112}
                height={112}
                className="h-28 w-28 rounded-2xl border border-emerald-100 bg-white object-contain p-2 dark:border-night-700"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Periode
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {program.tglMulai ?? "—"} → {program.tglSelesai ?? "—"}
              </p>
              {program.durasi && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{program.durasi}</p>
              )}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <Wallet className="h-3.5 w-3.5" aria-hidden /> Budget
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {formatBudget(program.budget)}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> Provinsi
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {formatProvinsi(program.provinsi)}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <FileText className="h-3.5 w-3.5" aria-hidden /> Deskripsi
              </p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                {program.deskripsi || "—"}
              </p>
            </div>
          </div>

          {program.budgetDetail.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-night-700 dark:bg-emerald-950/20">
              <p className="mb-3 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                Rincian Anggaran Pohon
              </p>
              <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white dark:border-night-700 dark:bg-night-900">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-night-700 dark:bg-night-800">
                    <tr>
                      <th className="px-3 py-2">Harga Pohon</th>
                      <th className="px-3 py-2 text-center">Jumlah</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                    {program.budgetDetail.map((row, i) => (
                      <tr key={`${row.harga}-${i}`}>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-bold ${priceBadge(row.harga)}`}>
                            {formatBudget(row.harga)} / pohon
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-zinc-700 dark:text-zinc-200">
                          {row.qty}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-300">
                          {formatBudget(row.harga * row.qty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-100/80 px-4 py-3 dark:bg-emerald-900/30">
                <span className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                  Total Pohon:
                  <span className="rounded-lg bg-emerald-200/80 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
                    {program.budgetDetail.reduce((s, r) => s + r.qty, 0)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">Total Budget Program</span>
                  <span className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20">
                    {formatBudget(program.budget)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-emerald-100 px-5 py-4 dark:border-night-700">
          <Link
            href={`/mitra/program?edit=${program.id}`}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Edit
          </Link>
          <Link
            href="/mitra/program"
            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            Tutup
          </Link>
        </div>
      </div>
    </div>
  );
}
