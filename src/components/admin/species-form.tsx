"use client";

import { useActionState } from "react";
import { createSpecies, updateSpecies } from "@/lib/actions/species";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiSpeciesDetail } from "@/lib/api";
import FileInput from "@/components/file-input";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function SpeciesForm({ species }: { species?: ApiSpeciesDetail }) {
  const isEdit = !!species;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateSpecies : createSpecies,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={species?.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama Latin *</label>
          <input
            name="nama_latin"
            type="text"
            required
            defaultValue={species?.namaLatin}
            className={inputClass}
            placeholder="mis. Shorea parvifolia"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama Lokal</label>
          <input
            name="nama_lokal"
            type="text"
            defaultValue={species?.namaLokal}
            className={inputClass}
            placeholder="mis. Meranti Putih"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Famili</label>
          <input
            name="famili"
            type="text"
            defaultValue={species?.famili}
            className={inputClass}
            placeholder="mis. Dipterocarpaceae"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Serapan Karbon <span className="text-zinc-400 dark:text-zinc-500">(kg CO₂/pohon/tahun)</span>
          </label>
          <input
            name="serapan_karbon"
            type="text"
            inputMode="decimal"
            defaultValue={species?.serapanKarbon ?? ""}
            className={inputClass}
            placeholder="mis. 35"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Kunci Data Pohon (species_key)
        </label>
        <input
          name="species_key"
          type="text"
          defaultValue={species?.speciesKey}
          className={inputClass}
          placeholder="mis. Shorea parvifolia,Shorea parvifolia Miq"
        />
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Variasi nama spesies persis seperti di data pohon (kolom species), dipisah koma —
          dipakai untuk menghitung jumlah pohon terkait di katalog publik.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Deskripsi</label>
        <textarea
          name="deskripsi"
          rows={5}
          defaultValue={species?.deskripsi}
          className={inputClass}
          placeholder="Deskripsi spesies untuk halaman katalog…"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Foto <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <FileInput name="foto" />
        {isEdit && species?.photoUrl && (
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
          Spesies tersimpan.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Spesies"}
      </button>
    </form>
  );
}
