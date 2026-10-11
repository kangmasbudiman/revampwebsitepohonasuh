"use client";

import { useActionState } from "react";
import { uploadLaporanFoto } from "@/lib/actions/laporan";
import type { AdminState } from "@/lib/actions/admin";
import FileInput from "@/components/file-input";

export default function LaporanGaleriForm({ idlaporan }: { idlaporan: number }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(uploadLaporanFoto, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="idlaporan" value={idlaporan} />
      <FileInput name="foto" className="min-w-0 flex-1" />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Mengunggah…" : "Unggah Foto"}
      </button>
      {state.error && (
        <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Foto ditambahkan ke laporan.
        </p>
      )}
    </form>
  );
}
