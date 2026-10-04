"use client";

// Popup sukses (tambah/edit pohon): modal band gradasi emerald, ditutup via
// tombol/backdrop/Escape lalu membersihkan query param pemicunya supaya
// tidak muncul lagi saat refresh.

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck } from "lucide-react";

export default function SuccessPopup({
  paramKey,
  title,
  subtitle,
  children,
  buttonLabel = "Selesai",
}: {
  paramKey: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tombolRef = useRef<HTMLButtonElement>(null);

  const tutup = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(paramKey);
    router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    tombolRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Pohon tersimpan">
      <button
        type="button"
        aria-label="Tutup popup sukses"
        onClick={tutup}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />
      <div className="animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl dark:border-night-700 dark:bg-night-900">
        <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 dark:from-night-800 dark:to-night-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
            <CircleCheck className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold pa-hgrad">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            )}
          </div>
        </div>
        {children && <div className="px-5 py-4 text-sm text-zinc-600 dark:text-zinc-300">{children}</div>}
        <div className="flex justify-end border-t border-emerald-50 px-5 py-4 dark:border-night-800">
          <button
            ref={tombolRef}
            type="button"
            onClick={tutup}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:from-emerald-700 hover:to-teal-700"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
