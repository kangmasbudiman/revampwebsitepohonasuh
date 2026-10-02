"use client";

import { useActionState } from "react";
import { updateKontak } from "@/lib/actions/setting";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiKontak } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function KontakForm({ kontak }: { kontak: ApiKontak }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(updateKontak, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama Organisasi *</label>
          <input name="nama" type="text" required defaultValue={kontak.nama} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Email *</label>
          <input name="email" type="email" required defaultValue={kontak.email} className={inputClass} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Telepon *</label>
          <input name="telepon" type="text" required defaultValue={kontak.telepon} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">WhatsApp *</label>
          <input name="whatsapp" type="text" required defaultValue={kontak.whatsapp} className={inputClass} />
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
          Kontak tersimpan.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan Kontak"}
      </button>
    </form>
  );
}
