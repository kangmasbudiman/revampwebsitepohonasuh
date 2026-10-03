"use client";

import { useActionState } from "react";
import { markComplete, markInProgress, uploadTaggingPhoto } from "@/lib/actions/tagging";
import type { AdminState } from "@/lib/actions/admin";
import { cekUkuranFile } from "@/lib/file-guard";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function TaggingForm({
  id,
  idpohon,
  proses,
}: {
  id: number;
  idpohon: string;
  proses: number;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(uploadTaggingPhoto, {});

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-2">
        <input type="hidden" name="idadopsi" value={id} />
        <input type="hidden" name="idpohon" value={idpohon} />
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Foto Tagging <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="foto"
            type="file"
            onChange={cekUkuranFile}
            accept="image/jpeg,image/png,image/webp"
            required
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Mengunggah…" : "Unggah"}
          </button>
        </div>
        {state.error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
        {state.saved && !state.error && (
          <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
            Foto tagging terunggah.
          </p>
        )}
      </form>

      <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-night-800">
        {proses < 2 && (
          <form action={markInProgress}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100"
            >
              Mulai Proses
            </button>
          </form>
        )}
        {proses === 2 && (
          <form action={markComplete}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="idpohon" value={idpohon} />
            <button
              type="submit"
              onClick={(e) => {
                if (
                  !confirm(
                    `Tandai tagging pohon ${idpohon} SELESAI? Pohon akan berstatus teradopsi dan donatur dinotifikasi — tidak bisa dibatalkan.`,
                  )
                )
                  e.preventDefault();
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Tandai Selesai
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
