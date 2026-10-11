"use client";

import { useActionState } from "react";
import { createLaporan, updateLaporan } from "@/lib/actions/laporan";
import { LAPORAN_JENIS, type ApiLaporan } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-200";

export default function LaporanForm({
  laporan,
  desaList,
}: {
  laporan?: ApiLaporan;
  desaList: { nama: string; label: string }[];
}) {
  const edit = Boolean(laporan);
  const [state, action, pending] = useActionState<AdminState, FormData>(
    edit ? updateLaporan : createLaporan,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      {edit && <input type="hidden" name="id" value={laporan!.id} />}
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Judul Kegiatan *</label>
          <input
            name="judul"
            type="text"
            required
            defaultValue={laporan?.judul ?? ""}
            placeholder="mis. Tagging 15 pohon di Rantau Kermas"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Jenis Kegiatan *</label>
          <select name="jenis" defaultValue={laporan?.jenis ?? "tagging"} className={inputClass}>
            {LAPORAN_JENIS.map((j) => (
              <option key={j.key} value={j.key}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Tanggal Kegiatan *</label>
          <input
            name="tanggal"
            type="date"
            required
            defaultValue={laporan?.tanggal ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Lokasi / Desa <span className="text-zinc-400 dark:text-zinc-500">(opsional)</span>
          </label>
          <select name="desa" defaultValue={laporan?.desa ?? ""} className={inputClass}>
            <option value="">— Tanpa desa tertentu —</option>
            {desaList.map((d) => (
              <option key={d.nama} value={d.nama}>
                {d.label || d.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Uraian Kegiatan *</label>
        <textarea
          name="isi"
          rows={4}
          required
          defaultValue={laporan?.isi ?? ""}
          placeholder="Ceritakan kegiatan yang dilakukan: pohon yang ditandai, kondisi lapangan, kendala, dll."
          className={inputClass}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : edit ? "Simpan Perubahan" : "Simpan Laporan"}
        </button>
        {edit && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Foto bukti kegiatan dikelola di panel Galeri Foto di bawah.
          </p>
        )}
      </div>
    </form>
  );
}
