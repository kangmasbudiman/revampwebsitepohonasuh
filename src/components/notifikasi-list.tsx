"use client";

// Daftar notifikasi member (halaman penuh). Paritas halaman "Pesan" mobile:
// klik kartu pesan belum-dibaca → tandai dibaca; tombol hapus → modal
// konfirmasi (pola cancel-order-button) → hapus permanen.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { hapusPesan, hapusSemuaPesan, markPesanRead, type PesanRow } from "@/lib/actions/pesan";
import { useI18n } from "@/components/i18n-provider";

export default function NotifikasiList({ rows }: { rows: PesanRow[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashboard.notif;
  const [items, setItems] = useState(rows);
  const [idHapus, setIdHapus] = useState<number | null>(null);
  const [semuaOpen, setSemuaOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const batalRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setItems(rows), [rows]);

  const target = items.find((i) => i.id === idHapus) ?? null;
  const modalOpen = target !== null || semuaOpen;

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIdHapus(null);
        setSemuaOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    batalRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  const tandaiDibaca = (row: PesanRow) => {
    if (row.status !== "noread") return;
    setItems((its) => its.map((i) => (i.id === row.id ? { ...i, status: "read" } : i)));
    void markPesanRead(row.id).then(() => router.refresh());
  };

  const jalankanHapus = async () => {
    if (target === null) return;
    setPending(true);
    const ok = await hapusPesan(target.id);
    setPending(false);
    if (ok) {
      setItems((its) => its.filter((i) => i.id !== target.id));
      setIdHapus(null);
      router.refresh();
    }
  };

  const jalankanHapusSemua = async () => {
    setPending(true);
    await hapusSemuaPesan();
    setPending(false);
    setSemuaOpen(false);
    setItems([]);
    router.refresh();
  };

  const unread = items.filter((i) => i.status === "noread").length;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white px-6 py-14 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Bell className="h-7 w-7 text-emerald-600" />
        </span>
        <p className="mt-4 font-bold text-emerald-950">{t.emptyTitle}</p>
        <p className="mt-1 text-sm text-zinc-500">{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {unread > 0 ? (
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-emerald-700">{unread}</span> {t.unreadHint}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setSemuaOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t.deleteAll}
        </button>
      </div>

      <div className="space-y-3">
        {items.map((row) => {
          const belum = row.status === "noread";
          return (
            <div
              key={row.id}
              className={`flex items-start gap-4 rounded-2xl border p-5 shadow-sm transition-colors ${
                belum
                  ? "cursor-pointer border-emerald-200 bg-white hover:bg-emerald-50/50"
                  : "border-emerald-100 bg-white/70"
              }`}
              onClick={() => tandaiDibaca(row)}
              role={belum ? "button" : undefined}
              tabIndex={belum ? 0 : undefined}
              onKeyDown={
                belum
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        tandaiDibaca(row);
                      }
                    }
                  : undefined
              }
            >
              <span
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  belum ? "bg-emerald-100" : "bg-zinc-100"
                }`}
              >
                {belum ? (
                  <BellRing className="h-5 w-5 text-emerald-700" />
                ) : (
                  <Bell className="h-5 w-5 text-zinc-400" />
                )}
                {belum && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-600" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-6 ${
                    belum ? "font-medium text-zinc-800" : "text-zinc-500"
                  }`}
                >
                  {row.pesan}
                </p>
                <p className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
                  {row.tanggal ?? ""}
                  {belum && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {t.new}
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                aria-label={`${t.deleteAria} ${row.id}`}
                title={t.deleteAria}
                onClick={(e) => {
                  e.stopPropagation();
                  setIdHapus(row.id);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {target && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label={t.deleteDialogAria}
        >
          <button
            type="button"
            aria-label={t.closeDialogAria}
            onClick={() => setIdHapus(null)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div className="animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-red-50 bg-red-50/70 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-emerald-950">{t.deleteTitle}</h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{target.pesan}</p>
              </div>
            </div>
            <p className="px-5 py-4 text-sm text-zinc-600">{t.deleteConfirm}</p>
            <div className="flex flex-col-reverse gap-2 border-t border-emerald-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                ref={batalRef}
                type="button"
                onClick={() => setIdHapus(null)}
                disabled={pending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={jalankanHapus}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {pending ? t.deleting : t.deleteYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {semuaOpen && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label={t.deleteAllDialogAria}
        >
          <button
            type="button"
            aria-label={t.closeAllDialogAria}
            onClick={() => setSemuaOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
          />
          <div className="animate-menu relative mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-red-50 bg-red-50/70 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-emerald-950">{t.deleteAllTitle}</h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {items.length} {t.deleteAllCount}
                </p>
              </div>
            </div>
            <p className="px-5 py-4 text-sm text-zinc-600">{t.deleteAllConfirm}</p>
            <div className="flex flex-col-reverse gap-2 border-t border-emerald-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                ref={batalRef}
                type="button"
                onClick={() => setSemuaOpen(false)}
                disabled={pending}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={jalankanHapusSemua}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {pending ? t.deleting : t.deleteAllYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
