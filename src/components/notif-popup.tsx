"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Bell, BellOff, BellRing, Trash2, X } from "lucide-react";
import type { PesanRow } from "@/lib/actions/pesan";

// Label panel popup — disuntikkan konsumen agar tetap satu komponen untuk
// lonceng member (terjemahan dari dict) dan lonceng admin (selalu Indonesia).
export type NotifPopupLabels = {
  title: string;
  unread: string;
  allRead: string;
  closeAria: string;
  emptyTitle: string;
  emptyDesc: string;
  markRead: string;
  deleteLabel: string;
  viewAll: string;
  justNow: string;
  minAgo: string;
  hourAgo: string;
  yesterday: string;
  dayAgo: string;
};

// Panel popup notifikasi bersama (lonceng member + admin). Posisi absolut
// ditentukan pembungkus di komponen lonceng masing-masing; komponen ini
// hanya merender panelnya.
//
// `tanggal` dari API berformat "d M Y, H:i" (bulan singkat Inggris) —
// waktu relatif dihitung manual; bila gagal parse, tampilkan apa adanya.
function waktuLalu(t: NotifPopupLabels, tanggal: string | null | undefined): string {
  if (!tanggal) return "";
  const bulan: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}), (\d{2}):(\d{2})$/.exec(tanggal);
  if (m && m[2] in bulan) {
    const d = new Date(+m[3], bulan[m[2]], +m[1], +m[4], +m[5]);
    const menit = Math.floor((Date.now() - d.getTime()) / 60000);
    if (menit < 1) return t.justNow;
    if (menit < 60) return `${menit} ${t.minAgo}`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} ${t.hourAgo}`;
    if (jam < 48) return t.yesterday;
    if (jam < 24 * 7) return `${Math.floor(jam / 24)} ${t.dayAgo}`;
  }
  return tanggal;
}

export default function NotifPopup({
  t,
  unread,
  loading,
  items,
  onRead,
  onDelete,
  onClose,
  onNavigate,
  sheet = false,
}: {
  t: NotifPopupLabels;
  unread: number;
  loading: boolean;
  items: PesanRow[] | null;
  onRead: (row: PesanRow) => void;
  onDelete: (row: PesanRow) => void;
  onClose: () => void;
  onNavigate?: () => void;
  sheet?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal hanya setelah mount (SSR-safe); sheet dibuka lewat interaksi user
  // jauh setelah mount, tak ada risiko kedip.
  const [siap, setSiap] = useState(false);
  useEffect(() => setSiap(true), []);

  // Mode sheet (drawer mobile): kunci scroll body selama terbuka.
  useEffect(() => {
    if (!sheet) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const isi = (
    <>
      {/* Kepala panel */}
      <div className="flex items-center gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-transparent px-4 py-3 dark:border-night-700 dark:from-night-800 dark:via-night-800/50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
          <Bell className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-emerald-950 dark:text-emerald-100">
            {t.title}
          </span>
          <span className="block text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
            {unread > 0 ? `${unread} ${t.unread}` : t.allRead}
          </span>
        </span>
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        <button
          type="button"
          aria-label={t.closeAria}
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-night-700 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Daftar */}
      <div className="max-h-[22rem] overflow-y-auto">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3.5">
              <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-emerald-100/80 dark:bg-night-800" />
              <span className="flex-1 space-y-2 pt-1">
                <span className="block h-3 w-full animate-pulse rounded-full bg-emerald-100/80 dark:bg-night-800" />
                <span className="block h-3 w-2/3 animate-pulse rounded-full bg-emerald-100/60 dark:bg-night-800" />
              </span>
            </div>
          ))
        ) : !items || items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-400 dark:bg-night-800 dark:text-emerald-500">
              <BellOff className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t.emptyTitle}
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t.emptyDesc}</p>
          </div>
        ) : (
          items.map((row) => {
            const baru = row.status === "noread";
            return (
              <div
                key={row.id}
                className={`group/item flex items-start border-l-[3px] border-b border-emerald-50 last:border-b-0 dark:border-night-800 ${
                  baru ? "border-l-emerald-500 bg-emerald-50/60 dark:bg-night-800/40" : "border-l-transparent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onRead(row)}
                  title={baru ? t.markRead : undefined}
                  className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-night-800/70"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      baru
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30"
                        : "bg-zinc-100 text-zinc-400 dark:bg-night-800 dark:text-zinc-500"
                    }`}
                  >
                    {baru ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`line-clamp-2 text-sm leading-snug ${
                        baru
                          ? "font-semibold text-zinc-800 dark:text-zinc-100"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {row.pesan}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {waktuLalu(t, row.tanggal)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${t.deleteLabel} ${row.id}`}
                  title={t.deleteLabel}
                  onClick={() => onDelete(row)}
                  className="mr-2 mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Kaki panel */}
      <Link
        href="/dashboard/notifikasi"
        onClick={() => {
          onClose();
          onNavigate?.();
        }}
        className="group flex items-center justify-center gap-1.5 border-t border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 px-4 py-3 text-xs font-bold text-emerald-700 transition-colors hover:from-emerald-100 hover:to-teal-100 dark:border-night-700 dark:from-night-800/60 dark:to-night-800/30 dark:text-emerald-300 dark:hover:from-night-800 dark:hover:to-night-800"
      >
        {t.viewAll}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </>
  );

  // sheet=true (dibuka dari drawer mobile): bottom-sheet modal dengan backdrop,
  // bukan popup jangkar yang menimpa menu drawer. Dirender lewat portal ke
  // document.body karena ancestor drawer mempertahankan transform (animate-menu
  // fill both) yang mengubah containing block elemen fixed.
  if (sheet) {
    if (!siap) return null;
    return createPortal(
      <div
        data-notif-popup
        className="fixed inset-0 z-[70] flex items-end justify-center bg-emerald-950/50 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        {/* Backdrop non-focusable (aria-hidden) — tombol X + Escape sudah ada;
        label dipisah dari tombol X agar tak dobel di a11y/E2E strict mode. */}
        <div aria-hidden="true" onClick={onClose} className="absolute inset-0 cursor-default" />
        <div className="animate-menu relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/30 sm:rounded-2xl dark:border-night-700 dark:bg-night-900">
          {isi}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      data-notif-popup
      className="animate-menu absolute right-0 top-full z-50 mt-3 w-[22rem] origin-top-right overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/20 max-w-[calc(100vw-2rem)] sm:w-96 dark:border-night-700 dark:bg-night-900 dark:shadow-black/50"
    >
      {isi}
    </div>
  );
}
