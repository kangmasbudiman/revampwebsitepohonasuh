"use client";

import { useActionState } from "react";
import { tambahProvinsi, editProvinsi } from "@/lib/actions/provinsi";
import type { AdminState } from "@/lib/actions/admin";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-200";

export default function ProvinsiForm({ provinsi }: { provinsi?: { id: number; name: string } }) {
  const edit = Boolean(provinsi);
  const [state, action, pending] = useActionState<AdminState, FormData>(
    edit ? editProvinsi : tambahProvinsi,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      {edit && <input type="hidden" name="id" value={provinsi!.id} />}
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}
      <div>
        <label className={labelClass}>Nama Provinsi</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Kalimantan Timur"
          defaultValue={provinsi?.name ?? ""}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Dipakai untuk pilihan provinsi di Program Mitra.
        </p>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : edit ? "Simpan Perubahan" : "Tambah Provinsi"}
        </button>
      </div>
    </form>
  );
}
