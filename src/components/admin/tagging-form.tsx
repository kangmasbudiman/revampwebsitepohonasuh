"use client";

import { useActionState } from "react";
import { markComplete, markInProgress, uploadTaggingPhoto } from "@/lib/actions/tagging";
import type { AdminState } from "@/lib/actions/admin";
import FileInput from "@/components/file-input";

// Form aksi tagging per alur baru:
// - proses 1 (Baru): petugas hanya melihat tombol "Mulai Proses" (mengajukan
//   permintaan ke admin) — tanpa form catatan/foto.
// - proses 2 (Di Proses) DAN sudah di-acc admin: form upload foto + tombol
//   "Tandai Selesai".
// - proses 2 belum acc / proses 3: tidak merender apa pun.
export default function TaggingForm({
  id,
  idpohon,
  proses,
  acc,
  isAdmin,
}: {
  id: number;
  idpohon: string;
  proses: number;
  acc: boolean;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(uploadTaggingPhoto, {});

  if (proses === 1) {
    if (isAdmin) return null;
    return (
      <form action={markInProgress}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          data-testid="btn-mulai-proses"
          className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60"
        >
          Mulai Proses
        </button>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Mengajukan permintaan ke admin — form foto & catatan terbuka setelah disetujui.
        </p>
      </form>
    );
  }

  if (proses === 2 && acc) {
    return (
      <div className="space-y-3">
        <form action={action} className="space-y-2" data-testid="form-upload-tagging">
          <input type="hidden" name="idadopsi" value={id} />
          <input type="hidden" name="idpohon" value={idpohon} />
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Foto Tagging <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <FileInput name="foto" className="mt-1 min-w-0 flex-1" />
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
          <form action={markComplete}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="idpohon" value={idpohon} />
            <button
              type="submit"
              data-testid="btn-tandai-selesai"
              onClick={(e) => {
                if (
                  !confirm(
                    `Tandai tagging pohon ${idpohon} SELESAI? Pohon akan berstatus teradopsi dan pengadopsi dinotifikasi — tidak bisa dibatalkan.`,
                  )
                )
                  e.preventDefault();
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Tandai Selesai
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
