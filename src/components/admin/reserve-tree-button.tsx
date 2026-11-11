"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { reserveTree } from "@/lib/actions/tree";

// Tombol "Pesan Pohon" di menu Data Pohon: admin memasukkan nama pemesan,
// lalu pohon berstatus "Dipesan Admin" dan tidak bisa diadopsi pengunjung.
export default function ReserveTreeButton({
  code,
  localName,
}: {
  code: string;
  localName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Pesan pohon ini untuk pemesan tertentu"
        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-night-800"
      >
        <Bookmark aria-hidden className="h-3.5 w-3.5" /> Pesan Pohon
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pesan-pohon-${code}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`pesan-pohon-${code}`}
              className="text-lg font-bold text-emerald-950 dark:text-zinc-100"
            >
              Pesan Pohon {code}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {localName} — setelah dipesan, pohon berstatus{" "}
              <strong>Dipesan Admin</strong> dan tidak bisa diadopsi pengunjung
              sampai pesanan dibatalkan.
            </p>

            <form action={reserveTree} className="mt-4">
              <input type="hidden" name="idpohon" value={code} />
              <label
                htmlFor={`nama-pemesan-${code}`}
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Nama pemesan
              </label>
              <input
                id={`nama-pemesan-${code}`}
                name="nama"
                required
                maxLength={255}
                autoFocus
                placeholder="mis. Bapak Andi / PT Hijau Lestari"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              />

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
                  Konfirmasi Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
