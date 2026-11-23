"use client";

import { MapPin, Sprout, Trees, Wallet, X } from "lucide-react";
import { namaDesa, rupiah, tanggal } from "@/lib/format";
import type { ApiProgramMitra, OrderTreeMini } from "@/lib/api";

export type RiwayatRow = {
  id: number;
  program_id: number | null;
  program_nama: string | null;
  desa: string | null;
  jumlah: number;
  catatan: string | null;
  status: string;
  created_at: string | null;
  trees?: OrderTreeMini[];
};

export const STATUS_LABEL: Record<string, [string, string]> = {
  pending: ["Menunggu Persetujuan", "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"],
  approved: ["Disetujui", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"],
  rejected: ["Ditolak", "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"],
  cancelled: ["Dibatalkan", "bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400"],
  dihapus: ["Dihapus", "bg-zinc-200 text-zinc-700 dark:bg-night-700 dark:text-zinc-300"],
  selesai: ["Selesai", "bg-emerald-600 text-white"],
};

// Status efektif — jika admin disetujui & masa program sudah berakhir → "Selesai".
export function orderEffStatus(order: RiwayatRow, program?: ApiProgramMitra): string {
  const progEnd = program?.tglSelesai ? new Date(`${program.tglSelesai}T00:00:00`) : null;
  const ended = progEnd && !Number.isNaN(progEnd.getTime()) && progEnd <= new Date();
  return order.status === "approved" && ended ? "selesai" : order.status;
}

export function statusLabelFor(order: RiwayatRow, program?: ApiProgramMitra): [string, string] {
  const eff = orderEffStatus(order, program);
  return STATUS_LABEL[eff] ?? STATUS_LABEL[order.status] ?? [order.status, "bg-zinc-100 text-zinc-600"];
}

type Props = {
  order: RiwayatRow;
  program?: ApiProgramMitra;
  onClose: () => void;
};

// Popup detail satu pesanan (tombol "Detail" di tabel Riwayat Pemesanan).
export default function OrderDetailModal({ order, program, onClose }: Props) {
  const [lbl] = [statusLabelFor(order, program)];
  const trees = order.trees ?? [];
  const lokasi = order.desa ?? trees[0]?.desa ?? null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail pesanan ${order.id}`}
    >
      <button type="button" className="absolute inset-0 cursor-default bg-black/55" onClick={onClose} aria-label="Tutup popup" />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-night-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Pesanan #{order.id}
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-emerald-950 dark:text-emerald-100">Pesanan Pohon</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-night-800 dark:hover:text-zinc-200"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              <Trees className="h-3.5 w-3.5" aria-hidden /> Pohon dipilih
            </p>
            {trees.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Tidak ada pohon di pesanan ini.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {trees.map((t) => (
                  <li key={t.code} className="text-sm text-zinc-800 dark:text-zinc-100">
                    <span className="font-mono font-semibold text-emerald-700">{t.code}</span> — {t.localName}
                    {t.species && <span className="ml-1 italic text-xs text-zinc-500">({t.species})</span>}
                    <span className="ml-1 text-xs text-zinc-500">📍 {t.desa ? namaDesa(t.desa) : "—"}</span>
                    {t.diameterCm != null && <span className="ml-1 text-xs text-zinc-500">Ø {t.diameterCm} cm</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Wallet className="h-3.5 w-3.5" aria-hidden /> Status</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${lbl[1]}`}>{lbl[0]}</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><MapPin className="h-3.5 w-3.5" aria-hidden /> Lokasi</p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{lokasi ? namaDesa(lokasi) : "Semua desa"}</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Sprout className="h-3.5 w-3.5" aria-hidden /> Jumlah pohon</p>
            <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{order.jumlah}</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Program</p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{order.program_nama ?? "—"}</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Wallet className="h-3.5 w-3.5" aria-hidden /> Budget program</p>
            <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{program?.budget ? rupiah(program.budget) : "—"}</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Masa program</p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">
              {program?.tglMulai ? tanggal(program.tglMulai) : "—"} → {program?.tglSelesai ? tanggal(program.tglSelesai) : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Tanggal pesan</p>
            <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{order.created_at ? tanggal(order.created_at) : "—"}</p>
          </div>

          {order.catatan && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Catatan</p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{order.catatan}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
