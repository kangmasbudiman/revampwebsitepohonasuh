"use client";

import { useActionState } from "react";
import { uploadTreePhoto } from "@/lib/actions/tree";
import type { AdminState } from "@/lib/actions/admin";

export default function TreeGalleryForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(uploadTreePhoto, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="idpohon" value={code} />
      <input
        name="foto"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
      />
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
          Foto ditambahkan ke galeri.
        </p>
      )}
    </form>
  );
}
