"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestPesananMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { CalendarDays, MapPin, Sprout, Wallet } from "lucide-react";
import { namaDesa, formatProvinsi, rupiah, tanggal } from "@/lib/format";
import type { ApiProgramMitra } from "@/lib/api";

// Form pemesanan pohon — Mitra pilih program, detail program (provinsi,
// jumlah pohon, masa program) tampil otomatis, lalu kirim untuk diverifikasi
// admin. Admin yang memilih pohon tersedia.
export default function MitraPohonOrderForm({
  desas,
  programs,
  desaActive = "",
}: {
  desas: { id: number; name: string }[];
  programs: ApiProgramMitra[];
  desaActive?: string;
}) {
  const router = useRouter();
  const desa = desaActive; // derived from URL — navigasi memicu re-fetch server-side
  const [programId, setProgramId] = useState<number | null>(null);

  const program = programId ? programs.find((p) => p.id === programId) ?? null : null;
  // Jumlah pohon diambil dari Rincian Anggaran program (fallback untuk data lama).
  const totalPohon = program
    ? program.budgetDetail.length > 0
      ? program.budgetDetail.reduce((s, r) => s + r.qty, 0)
      : program.budget
        ? Math.max(1, Math.round(program.budget / 200000))
        : 0
    : 0;

  return (
    <form action={requestPesananMitra} className="mt-6 space-y-4">
      {/* Pilihan lokasi & program */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300"><MapPin className="h-4 w-4" />Lokasi / Desa (opsional)</span>
            <select
              name="desa"
              value={desa}
              onChange={(e) => {
                const v = e.target.value;
                router.push(`/mitra/pesanan?desa=${encodeURIComponent(v)}`);
              }}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
            >
              <option value="">Semua lokasi</option>
              {desas.map((d) => (
                <option key={d.id} value={d.name}>{namaDesa(d.name)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Program *</span>
            <select
              name="program_id"
              value={programId ?? ""}
              onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : null)}
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
            >
              <option value="">Pilih program...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Catatan (opsional)</span>
          <input
            name="catatan"
            placeholder="mis. minimal diameter 30cm, prioritaskan desa X"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
        </label>
      </div>

      {/* Detail program otomatis */}
      {program && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-night-700 dark:bg-emerald-950/20">
          <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            Detail Program · {program.nama}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><MapPin className="h-3.5 w-3.5" /> Provinsi</p>
              <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{formatProvinsi(program.provinsi)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Sprout className="h-3.5 w-3.5" /> Jumlah Pohon</p>
              <p className="mt-1 text-sm font-bold text-emerald-700">{totalPohon}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><CalendarDays className="h-3.5 w-3.5" /> Masa Program</p>
              <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-100">
                {program.tglMulai ? tanggal(program.tglMulai) : "—"} → {program.tglSelesai ? tanggal(program.tglSelesai) : "—"}
              </p>
              {program.durasi && <p className="mt-0.5 text-[11px] text-zinc-500">{program.durasi}</p>}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Wallet className="h-3.5 w-3.5" /> Total Budget</p>
              <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{rupiah(program.budget ?? 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Kirim — jumlah pohon otomatis dari program */}
      <input type="hidden" name="program_id" value={programId ?? ""} />
      <input type="hidden" name="jumlah" value={totalPohon} />
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Jumlah pohon</span>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Otomatis mengikuti Rincian Anggaran program — admin akan memilih pohon tersedia.
            </p>
          </div>
          <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
            {totalPohon || "—"}
          </span>
        </div>
        <SubmitButton
          pendingLabel="Mengirim pesanan…"
          disabled={!program || totalPohon < 1}
          className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Kirim Permintaan Pemesanan
        </SubmitButton>
      </div>
    </form>
  );
}
