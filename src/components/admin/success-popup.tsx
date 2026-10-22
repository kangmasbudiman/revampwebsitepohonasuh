"use client";

// Popup notifikasi hasil aksi (tersimpan/terhapus/gagal/peringatan): modal
// band gradasi sesuai tone, ditutup via tombol/backdrop/Escape lalu
// membersihkan query param pemicunya supaya tidak muncul lagi saat refresh.

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";

const TONES = {
  ok: {
    icon: CircleCheck,
    ikonCls: "from-emerald-500 to-teal-600",
    headerCls: "from-emerald-50 to-teal-50 dark:from-night-800 dark:to-night-900",
    borderCls: "border-emerald-100 dark:border-night-700",
    footerCls: "border-emerald-50 dark:border-night-800",
    tombolCls:
      "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
  },
  err: {
    icon: CircleX,
    ikonCls: "from-red-500 to-rose-600",
    headerCls: "from-red-50 to-rose-50 dark:from-night-800 dark:to-night-900",
    borderCls: "border-red-100 dark:border-night-700",
    footerCls: "border-red-50 dark:border-night-800",
    tombolCls: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
  },
  warn: {
    icon: TriangleAlert,
    ikonCls: "from-amber-500 to-orange-600",
    headerCls: "from-amber-50 to-orange-50 dark:from-night-800 dark:to-night-900",
    borderCls: "border-amber-100 dark:border-night-700",
    footerCls: "border-amber-50 dark:border-night-800",
    tombolCls:
      "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700",
  },
} as const;

export default function SuccessPopup({
  paramKey,
  title,
  subtitle,
  children,
  tone = "ok",
  buttonLabel = "Selesai",
}: {
  paramKey: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  tone?: keyof typeof TONES;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tombolRef = useRef<HTMLButtonElement>(null);
  const t = TONES[tone];
  const Icon = t.icon;

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
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Tutup popup"
        onClick={tutup}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />
      <div
        className={`animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-night-900 ${t.borderCls}`}
      >
        <div className={`flex items-start gap-3 bg-gradient-to-r px-5 py-4 ${t.headerCls}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-sm ${t.ikonCls}`}>
            <Icon className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold pa-hgrad">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            )}
          </div>
        </div>
        {children && <div className="px-5 py-4 text-sm text-zinc-600 dark:text-zinc-300">{children}</div>}
        <div className={`flex justify-end border-t px-5 py-4 ${t.footerCls}`}>
          <button
            ref={tombolRef}
            type="button"
            onClick={tutup}
            className={`rounded-xl bg-gradient-to-r px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${t.tombolCls}`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
