"use client";

import { CalendarDays, X } from "lucide-react";
import { ajukanPerpanjangan } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import type { ApiProgramMitra } from "@/lib/api";

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

// Popup pengajuan perpanjangan masa program (menunggu approval admin).
export default function PerpanjangModal({
  program,
  onClose,
}: {
  program: ApiProgramMitra;
  onClose: () => void;
}) {
  const min = program.tglSelesai
    ? new Date(new Date(`${program.tglSelesai}T00:00:00`).getTime() + 86400000).toISOString().slice(0, 10)
    : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Perpanjang program ${program.nama}`}>
      <button type="button" className="absolute inset-0 cursor-default bg-black/55" onClick={onClose} aria-label="Tutup popup" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-night-900">
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Program #{program.id}</p>
            <h3 className="mt-1 text-lg font-extrabold text-emerald-950 dark:text-emerald-100">Ajukan Perpanjangan</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{program.nama}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-night-800" aria-label="Tutup">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form action={ajukanPerpanjangan} className="space-y-4 px-5 py-5">
          <input type="hidden" name="program_id" value={program.id} />
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-xs text-zinc-600 dark:border-night-700 dark:bg-night-800/50 dark:text-zinc-300">
            Masa program saat ini: <strong>{program.tglMulai ?? "—"} → {program.tglSelesai ?? "—"}</strong>
          </div>
          <label className="block">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden /> Tanggal Selesai Baru *
            </span>
            <input name="tgl_selesai_baru" type="date" min={min} required className={`mt-1 ${inputCls}`} />
            <p className="mt-1 text-[11px] text-zinc-500">Pilih tanggal setelah masa berlaku saat ini.</p>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Alasan (opsional)</span>
            <textarea name="alasan" rows={3} placeholder="mis. masih proses penanaman di lapangan" className={`mt-1 ${inputCls}`} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-night-700 dark:text-zinc-300">
              Batal
            </button>
            <SubmitButton pendingLabel="Mengirim…" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              Kirim Pengajuan
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
