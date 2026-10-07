"use client";

import { useActionState } from "react";
import { savePartner, saveTestimoni } from "@/lib/actions/testimoni";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiPartner, ApiTestimoni } from "@/lib/api";
import FileInput from "@/components/file-input";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

function Feedback({ state }: { state: AdminState }) {
  if (state.error) {
    return (
      <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
        Tersimpan.
      </p>
    );
  }
  return null;
}

export function TestimoniForm({ row }: { row?: ApiTestimoni }) {
  const isEdit = !!row;
  const [state, action, pending] = useActionState<AdminState, FormData>(saveTestimoni, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={row?.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama *</label>
          <input name="nama" type="text" required defaultValue={row?.nama} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Peran <span className="text-zinc-400 dark:text-zinc-500">(mis. Donatur sejak 2023)</span>
          </label>
          <input name="peran" type="text" defaultValue={row?.peran} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Isi Testimoni *</label>
        <textarea name="isi" rows={3} required defaultValue={row?.isi} className={inputClass} />
      </div>
      <div className="max-w-[140px]">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Urutan</label>
        <input
          name="urutan"
          type="number"
          defaultValue={row?.urutan ?? 0}
          className={inputClass}
        />
      </div>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Testimoni"}
      </button>
    </form>
  );
}

export function PartnerForm({ row }: { row?: ApiPartner }) {
  const isEdit = !!row;
  const [state, action, pending] = useActionState<AdminState, FormData>(savePartner, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={row?.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama *</label>
          <input name="nama" type="text" required defaultValue={row?.nama} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            URL Situs <span className="text-zinc-400 dark:text-zinc-500">(opsional)</span>
          </label>
          <input
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={row?.url}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Logo <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <FileInput name="logo" />
        {isEdit && row?.logoUrl && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Biarkan kosong untuk mempertahankan logo yang ada.
          </p>
        )}
      </div>
      <div className="max-w-[140px]">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Urutan</label>
        <input
          name="urutan"
          type="number"
          defaultValue={row?.urutan ?? 0}
          className={inputClass}
        />
      </div>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Partner"}
      </button>
    </form>
  );
}
