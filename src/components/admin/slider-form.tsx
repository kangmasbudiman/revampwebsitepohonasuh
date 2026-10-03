"use client";

import { useActionState } from "react";
import { createSlider, updateSlider } from "@/lib/actions/slider";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiSlider } from "@/lib/api";
import FileInput from "@/components/admin/file-input";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function SliderForm({ slide }: { slide?: ApiSlider }) {
  const isEdit = !!slide;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateSlider : createSlider,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={slide?.id} />
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Judul *</label>
        <input
          name="judul"
          type="text"
          required
          defaultValue={slide?.judul}
          className={inputClass}
          placeholder="Judul yang tampil besar di beranda"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Deskripsi *</label>
        <textarea
          name="deskripsi"
          required
          rows={3}
          defaultValue={slide?.deskripsi}
          className={inputClass}
          placeholder="Teks pendukung di bawah judul (1–2 kalimat)"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Gambar <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <FileInput name="gambar" />
        {isEdit && slide?.gambarFile && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Biarkan kosong untuk mempertahankan gambar ({slide.gambarFile}).
          </p>
        )}
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
          Slide tersimpan.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Slide"}
      </button>
    </form>
  );
}
