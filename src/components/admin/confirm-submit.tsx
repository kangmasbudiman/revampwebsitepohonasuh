"use client";

// Tombol submit untuk aksi destruktif/irreversible: konfirmasi via modal
// bertema (pola success-popup) — tombol utama modal tetap type="submit"
// sehingga form (server action) terkirim sebagaimana sebelumnya.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmSubmit({
  children,
  message,
  className,
  disabled,
  title,
  confirmLabel = "Ya, Lanjutkan",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const batalRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    batalRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        title={title}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Konfirmasi aksi">
          <button
            type="button"
            aria-label="Batal"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div className="animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl dark:border-night-700 dark:bg-night-900">
            <div className="flex items-center gap-3 bg-gradient-to-r from-red-50 to-rose-50 px-5 py-4 dark:from-night-800 dark:to-night-900">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-white" />
              </span>
              <h3 className="text-base font-bold text-red-700 dark:text-red-300">Konfirmasi Tindakan</h3>
            </div>
            <div className="px-5 py-4 text-sm text-zinc-600 dark:text-zinc-300">{message}</div>
            <div className="flex justify-end gap-2 border-t border-red-50 px-5 py-4 dark:border-night-800">
              <button
                ref={batalRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-200 dark:border-night-700 px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-night-800"
              >
                Batal
              </button>
              <button
                type="submit"
                data-confirm-submit
                className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:from-red-700 hover:to-rose-700"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
