"use client";

import { useActionState } from "react";
import { History, X } from "lucide-react";
import { editProgramMitraSelf } from "@/lib/actions/mitra";
import type { ApiProgramMitra } from "@/lib/api";
import AutoDurasi from "@/components/mitra/auto-durasi";
import AnggaranInput from "@/components/mitra/anggaran-input";
import { durasiDariTanggal } from "@/lib/format";
import ProvinsiDropdown from "@/components/mitra/provinsi-dropdown";

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";
const labelCls = "mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400";

type Props = {
  program: ApiProgramMitra;
  logoSrc: string | null;
  provinsiList: string[];
  onClose: () => void;
};

// Popup form edit program mitra — dibuka dari klik tombol "Edit" di tabel
// Program Mitra. Terapkan via server action editProgramMitraSelf.
export default function ProgramEditModal({ program, logoSrc, provinsiList, onClose }: Props) {
  const [, action, pending] = useActionState(editProgramMitraSelf, {});

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit program ${program.nama}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/55"
        onClick={onClose}
        aria-label="Tutup popup"
      />

      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-night-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Program #{program.id}
            </p>
            <h3 className="mt-1 truncate text-lg font-extrabold text-emerald-950 dark:text-emerald-100">
              {program.nama}
            </h3>
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

        {/* Form */}
        <form action={action} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={program.id} />

          {/* Kolom 1 — Program */}
          <div className="min-w-0 space-y-3">
            <div>
              <label className={labelCls}>Nama Program</label>
              <input name="nama" defaultValue={program.nama} required className={inputCls} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Tanggal Mulai</label>
                <input name="tgl_mulai" id="edit_tgl_mulai" type="date" defaultValue={program.tglMulai ?? ""} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Tanggal Selesai</label>
                <input name="tgl_selesai" id="edit_tgl_selesai" type="date" defaultValue={program.tglSelesai ?? ""} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Durasi</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-night-700 dark:bg-night-950/40 dark:text-emerald-200">
                <History className="h-4 w-4 text-emerald-600" aria-hidden />
                <span id="edit_durasi" aria-live="polite">{program.durasi || durasiDariTanggal(program.tglMulai, program.tglSelesai)}</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Provinsi</label>
              <ProvinsiDropdown
                name="provinsi"
                options={provinsiList}
                defaultValues={program.provinsi ? String(program.provinsi).split(",").map((s) => s.trim()).filter(Boolean) : []}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Status</label>
              <select name="aktif" defaultValue={program.aktif ? "1" : "0"} className={inputCls}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Logo Program (opsional)</label>
              <input
                name="logo"
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700"
              />
              {logoSrc && (
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Logo saat ini: <code className="break-all">{logoSrc.split("/").pop()}</code>
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Deskripsi Program (opsional)</label>
              <textarea name="deskripsi" defaultValue={program.deskripsi ?? ""} placeholder="Deskripsi program" className={inputCls} rows={3} />
            </div>
          </div>

          {/* Kolom 2 — Anggaran */}
          <div className="min-w-0">
            <AnggaranInput name="budget" />
          </div>

          <AutoDurasi mulaiId="edit_tgl_mulai" selesaiId="edit_tgl_selesai" targetId="edit_durasi" />

          <button
            type="submit"
            disabled={pending}
            className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
}
