"use client";

import { useState } from "react";
import { freezeTrees } from "@/lib/actions/tree";
import { toggleLokasiBeku } from "@/lib/actions/lokasi";

// Tombol pembekuan dengan modal "Konfirmasi Pembekuan": alasan (wajib) +
// durasi (manual atau preset 7/30/90 hari). Target bisa daftar kode pohon
// ATAU satu desa (semua pohon tersedia di desa itu).
export default function FreezeButton({
  codes,
  desa,
  children,
  className,
  title,
  balik = "/admin/pohon/beku",
  judul,
}: {
  codes?: string[];
  desa?: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  balik?: string;
  judul?: string;
}) {
  const [open, setOpen] = useState(false);
  const target = desa ? `seluruh pohon tersedia di ${desa}` : `${codes?.length ?? 0} pohon`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={title} className={className}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="freeze-dialog-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="freeze-dialog-title"
              className="text-lg font-bold text-emerald-950 dark:text-zinc-100"
            >
              {judul ?? "Konfirmasi Pembekuan"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {target} akan berstatus <strong>Pohon Sedang Dibekukan</strong> — tetap
              tampil di website, tetapi belum bisa diadopsi.
            </p>

            <form
              action={desa ? toggleLokasiBeku : freezeTrees}
              onSubmit={() => setTimeout(() => setOpen(false), 100)}
              className="mt-4"
            >
              {desa ? (
                <>
                  <input type="hidden" name="desa" value={desa} />
                  <input type="hidden" name="beku" value="yes" />
                </>
              ) : (
                (codes ?? []).map((c) => (
                  <input key={c} type="hidden" name="idpohon" value={c} />
                ))
              )}
              <input type="hidden" name="balik" value={balik} />

              <label
                htmlFor="alasan-beku"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Alasan pembekuan
              </label>
              <textarea
                id="alasan-beku"
                name="alasan"
                required
                maxLength={255}
                rows={2}
                autoFocus
                placeholder="mis. disiapkan untuk program CSR PT Hijau Lestari"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              />

              <label
                htmlFor="durasi-beku"
                className="mt-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Berlaku
              </label>
              <select
                id="durasi-beku"
                name="hari"
                defaultValue="0"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              >
                <option value="0">Sampai dibuka manual oleh admin</option>
                <option value="7">Sementara — 7 hari</option>
                <option value="30">Sementara — 30 hari</option>
                <option value="90">Sementara — 90 hari</option>
              </select>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="pa-btn-primary rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  Konfirmasi Pembekuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
