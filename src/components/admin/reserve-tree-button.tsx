"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";
import { reserveTree } from "@/lib/actions/tree";
import SubmitButton from "@/components/admin/submit-button";

// Tombol "Pesan Pohon" di menu Data Pohon: admin memasukkan nama pemesan,
// lalu pohon berstatus "Dipesan Admin" dan tidak bisa diadopsi pengunjung.
// Mendukung banyak pohon sekaligus (codes lebih dari satu) — satu nama pemesan
// untuk semua pohon terpilih. Modal remount lewat key=searchParams (pola
// FreezeButton) sehingga tertutup otomatis setelah server action me-redirect.
export default function ReserveTreeButton(props: React.ComponentProps<typeof ReserveTreeInner>) {
  const searchParams = useSearchParams();
  return <ReserveTreeInner key={searchParams.toString()} {...props} />;
}

function ReserveTreeInner({
  codes,
  localName,
  label = "Pesan Pohon",
  title = "Pesan pohon ini untuk pemesan tertentu",
  className = "inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-night-800",
}: {
  codes: string[];
  /** Nama lokal pohon — hanya untuk tampilan saat satu pohon. */
  localName?: string;
  label?: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const banyak = codes.length > 1;
  const pratinjau = banyak
    ? `${codes.slice(0, 5).join(", ")}${codes.length > 5 ? ` +${codes.length - 5} lainnya` : ""}`
    : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        className={className}
      >
        <Bookmark aria-hidden className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pesan-pohon-${codes[0]}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`pesan-pohon-${codes[0]}`}
              className="text-lg font-bold text-emerald-950 dark:text-zinc-100"
            >
              {banyak ? `Pesan ${codes.length} Pohon` : `Pesan Pohon ${codes[0]}`}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {banyak ? (
                <>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:bg-night-800 dark:text-zinc-200">
                    {pratinjau}
                  </span>{" "}
                  akan dipesan untuk satu nama pemesan — setelah dipesan, semua
                  berstatus <strong>Dipesan Admin</strong> dan tidak bisa diadopsi
                  pengunjung sampai pesanan dibatalkan.
                </>
              ) : (
                <>
                  {localName} — setelah dipesan, pohon berstatus{" "}
                  <strong>Dipesan Admin</strong> dan tidak bisa diadopsi pengunjung
                  sampai pesanan dibatalkan.
                </>
              )}
            </p>

            <form action={reserveTree} className="mt-4">
              {codes.map((c) => (
                <input key={c} type="hidden" name="idpohon" value={c} />
              ))}
              <label
                htmlFor={`nama-pemesan-${codes[0]}`}
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Nama pemesan
              </label>
              <input
                id={`nama-pemesan-${codes[0]}`}
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
                <SubmitButton
                  pendingLabel="Memproses…"
                  className="pa-btn-primary rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  Konfirmasi Pesanan
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
