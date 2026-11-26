"use client";

import { useActionState } from "react";
import { markComplete, markInProgress, uploadTaggingPhoto } from "@/lib/actions/tagging";
import type { AdminState } from "@/lib/actions/admin";
import FileInput from "@/components/file-input";
import { Camera, CheckCircle2, ImagePlus, Loader2, Tag } from "lucide-react";

// Form aksi tagging (alur baru):
// - proses 1 (Baru): petugas hanya melihat tombol "Mulai Proses".
// - proses 2 (Diproses) & sudah di-acc admin: form upload foto + tombol "Tandai Selesai".
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
      <form action={markInProgress} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          data-testid="btn-mulai-proses"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
        >
          <Tag className="h-4 w-4" aria-hidden /> Mulai Proses
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Mengajukan permintaan ke admin — form foto & catatan terbuka setelah disetujui.
        </p>
      </form>
    );
  }

  if (proses === 2 && acc) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
        <form action={action} className="space-y-3" data-testid="form-upload-tagging">
          <input type="hidden" name="idadopsi" value={id} />
          <input type="hidden" name="idpohon" value={idpohon} />

          <label className="block">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <ImagePlus className="h-4 w-4 text-emerald-600" aria-hidden /> Foto Tagging
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              jpg/png/webp, maks 2MB — bisa pilih beberapa sekaligus. Preview & pembatalan per file tersedia di bawah.
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <FileInput
                name="foto"
                multiple
                className="min-w-0 flex-1"
              />
              <button
                type="submit"
                disabled={pending}
                className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Mengunggah…</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5"><Camera className="h-4 w-4" aria-hidden />Unggah</span>
                )}
              </button>
            </div>
          </label>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{state.error}</p>
          )}
          {state.saved && !state.error && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40">{state.pesan ?? "Foto tagging terunggah."}</p>
          )}
        </form>

        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-night-800">
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Tandai Selesai
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
