"use client";

import { useActionState } from "react";
import { createCerita, updateCerita } from "@/lib/actions/cerita";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiCerita } from "@/lib/api";
import FileInput from "@/components/file-input";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function CeritaForm({ cerita }: { cerita?: ApiCerita }) {
  const isEdit = !!cerita;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateCerita : createCerita,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={cerita?.id} />
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Judul *</label>
        <input
          name="judul"
          type="text"
          required
          maxLength={200}
          defaultValue={cerita?.judul}
          className={inputClass}
          placeholder="Judul cerita dampak"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Narasumber *
          </label>
          <input
            name="narasumber"
            type="text"
            required
            maxLength={120}
            defaultValue={cerita?.narasumber}
            className={inputClass}
            placeholder="Nama penerima manfaat"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Peran</label>
          <input
            name="peran"
            type="text"
            maxLength={150}
            defaultValue={cerita?.peran}
            className={inputClass}
            placeholder="mis. Petani desa Rantau Kermas"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Lokasi</label>
          <input
            name="lokasi"
            type="text"
            maxLength={150}
            defaultValue={cerita?.lokasi}
            className={inputClass}
            placeholder="mis. Rantau Kermas, Sarolangun"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Isi Cerita *</label>
        <textarea
          name="isi"
          required
          rows={8}
          defaultValue={cerita?.isi}
          className={inputClass}
          placeholder="Tulis kisah dampak program untuk narasumber ini…"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Foto <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <FileInput name="foto" />
        {isEdit && cerita?.fotoUrl && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Biarkan kosong untuk mempertahankan foto yang ada.
          </p>
        )}
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
          Cerita tersimpan.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Cerita"}
      </button>
    </form>
  );
}
