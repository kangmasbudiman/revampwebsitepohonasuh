"use client";

// Tombol "Batalkan Order" dengan modal konfirmasi tersendiri (menggantikan
// confirm() bawaan browser): menampilkan rincian order + daftar konsekuensi
// pembatalan sebelum benar-benar menjalankan aksi.

import { useEffect, useRef, useState, useTransition } from "react";
import { Ban, BellRing, Loader2, Trash2, TriangleAlert, TreePine, XCircle } from "lucide-react";
import { cancelOrder } from "@/lib/actions/tagging";

const KONSEKUENSI = [
  { icon: TreePine, teks: "Semua pohon pada invoice ini dikembalikan ke “tersedia” dan bisa diadopsi donor lain" },
  { icon: Trash2, teks: "Data adopsi dan foto tagging invoice ini dihapus" },
  { icon: BellRing, teks: "Donatur menerima notifikasi pembatalan" },
  { icon: XCircle, teks: "Tindakan permanen — tidak dapat dibatalkan" },
];

export default function CancelOrderButton({
  confirmasiId,
  invoice,
  idpohon,
  localName,
  nama,
}: {
  confirmasiId: number;
  invoice: string;
  idpohon: string;
  localName: string;
  nama: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const batalAmanRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    batalAmanRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const jalankan = () => {
    const fd = new FormData();
    fd.set("confirmasiId", String(confirmasiId));
    startTransition(async () => {
      await cancelOrder(fd);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <Ban className="h-3.5 w-3.5" /> Batalkan Order
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi pembatalan order"
        >
          <button
            type="button"
            aria-label="Tutup konfirmasi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div className="animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl dark:border-night-700 dark:bg-night-900">
            <div className="flex items-start gap-3 border-b border-red-50 bg-red-50/70 px-5 py-4 dark:border-night-700 dark:bg-red-950/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
                <TriangleAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold pa-hgrad">
                  Batalkan order ini?
                </h3>
                <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {localName} <span className="font-mono text-xs font-semibold">{idpohon}</span> ·{" "}
                  {nama}
                </p>
              </div>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Order{" "}
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:bg-night-800 dark:text-zinc-200">
                  {invoice}
                </span>{" "}
                akan dibatalkan secara permanen:
              </p>
              <ul className="mt-3 space-y-2">
                {KONSEKUENSI.map(({ icon: Icon, teks }) => (
                  <li key={teks} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                    <span>{teks}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-emerald-50 px-5 py-4 sm:flex-row sm:justify-end dark:border-night-800">
              <button
                ref={batalAmanRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-night-700 dark:text-zinc-200 dark:hover:bg-night-800"
              >
                Tidak, Kembali
              </button>
              <button
                type="button"
                onClick={jalankan}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                {pending ? "Membatalkan…" : "Ya, Batalkan Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
