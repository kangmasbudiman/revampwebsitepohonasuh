"use client";

// Tombol "Batalkan Proses" untuk PETUGAS — kebalikan "Mulai Proses":
// order kembali ke daftar Baru tanpa membatalkan adopsinya. Berbeda dari
// CancelOrderButton (admin): tidak menghapus order dan tidak mengganggu
// donatur.

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { cancelProses } from "@/lib/actions/tagging";

const KONSEKUENSI = [
  { icon: RotateCcw, teks: "Status order kembali ke “Baru” dan muncul lagi di daftar order baru" },
  { icon: Trash2, teks: "Foto tagging yang sudah diunggah untuk siklus ini dihapus" },
  { icon: Undo2, teks: "Order dan adopsi TETAP ADA — donatur tidak dinotifikasi" },
];

export default function CancelProsesButton({
  id,
  idpohon,
  localName,
}: {
  id: number;
  idpohon: string;
  localName: string;
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
    fd.set("id", String(id));
    startTransition(async () => {
      await cancelProses(fd);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Batalkan Proses
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi pembatalan proses"
        >
          <button
            type="button"
            aria-label="Tutup konfirmasi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div className="animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl dark:border-night-700 dark:bg-night-900">
            <div className="flex items-start gap-3 border-b border-amber-50 bg-amber-50/70 px-5 py-4 dark:border-night-700 dark:bg-amber-950/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                <TriangleAlert className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold pa-hgrad">Batalkan proses tagging ini?</h3>
                <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {localName} <span className="font-mono text-xs font-semibold">{idpohon}</span>
                </p>
              </div>
            </div>

            <div className="px-5 py-4">
              <ul className="space-y-2">
                {KONSEKUENSI.map(({ icon: Icon, teks }) => (
                  <li key={teks} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" />
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {pending ? "Membatalkan…" : "Ya, Batalkan Proses"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
