"use client";

import { useActionState } from "react";
import { createTree } from "@/lib/actions/admin";
import { updateTree } from "@/lib/actions/tree";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiTree } from "@/lib/api";
import FileInput from "@/components/admin/file-input";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function TreeForm({
  desas,
  tree,
}: {
  desas: { name: string }[];
  tree?: ApiTree;
}) {
  const isEdit = !!tree;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateTree : createTree,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Kode Pohon *</label>
          <input
            name="idpohon"
            type="text"
            required
            maxLength={7}
            readOnly={isEdit}
            defaultValue={tree?.code}
            className={`${inputClass} ${isEdit ? "bg-zinc-50 font-mono text-zinc-500 dark:bg-night-900 dark:text-zinc-400" : ""}`}
            placeholder="mis. RA-0012"
          />
          {!isEdit && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Maksimal 7 karakter (batas kode di database).
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama Lokal *</label>
          <input
            name="localName"
            type="text"
            required
            defaultValue={tree?.localName}
            className={inputClass}
            placeholder="contoh: Meranti"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Spesies</label>
          <input
            name="species"
            type="text"
            defaultValue={tree?.species ?? ""}
            className={inputClass}
            placeholder="Nama latin"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Desa {isEdit ? <span className="text-zinc-400 dark:text-zinc-500">(kosongkan untuk biarkan)</span> : "*"}
          </label>
          <select
            name="desa"
            required={!isEdit}
            className={inputClass}
            defaultValue={tree?.desa ?? ""}
          >
            <option value="">— Tanpa desa —</option>
            {desas.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Diameter (cm)</label>
          <input
            name="diameterCm"
            type="number"
            step="0.1"
            min="0"
            defaultValue={tree?.diameterCm ?? undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Tinggi (m)</label>
          <input
            name="heightM"
            type="number"
            step="0.1"
            min="0"
            defaultValue={tree?.heightM ?? undefined}
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Harga (Rp) *</label>
          <input
            name="priceIdr"
            type="number"
            required
            min="10000"
            step="10000"
            defaultValue={tree?.priceIdr}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Foto Pohon <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
          </label>
          <FileInput name="foto" />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {isEdit
              ? "Kosongkan untuk mempertahankan foto saat ini — unggahan menimpa URL foto."
              : "Kosongkan untuk memakai foto default otomatis dari server."}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            URL Foto <span className="text-zinc-400 dark:text-zinc-500">(opsional)</span>
          </label>
          <input
            name="photoUrl"
            type="text"
            defaultValue={tree?.photoUrl ?? ""}
            className={inputClass}
            placeholder="https://... (kosong = foto default)"
          />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Hanya dipakai bila tidak ada unggahan; unggahan di samping lebih diutamakan.
          </p>
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Pohon"}
      </button>
    </form>
  );
}
