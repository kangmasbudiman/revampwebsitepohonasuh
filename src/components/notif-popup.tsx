"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Bell, BellOff, BellRing, Trash2, X } from "lucide-react";
import type { PesanRow } from "@/lib/actions/pesan";

// Panel popup notifikasi bersama (lonceng member + admin). Posisi absolut
// ditentukan pembungkus di komponen lonceng masing-masing; komponen ini
// hanya merender panelnya.
//
// `tanggal` dari API berformat "d M Y, H:i" (bulan singkat Inggris) —
// waktu relatif dihitung manual; bila gagal parse, tampilkan apa adanya.
function waktuLalu(tanggal: string | null | undefined): string {
  if (!tanggal) return "";
  const bulan: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}), (\d{2}):(\d{2})$/.exec(tanggal);
  if (m && m[2] in bulan) {
    const d = new Date(+m[3], bulan[m[2]], +m[1], +m[4], +m[5]);
    const menit = Math.floor((Date.now() - d.getTime()) / 60000);
    if (menit < 1) return "baru saja";
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    if (jam < 48) return "Kemarin";
    if (jam < 24 * 7) return `${Math.floor(jam / 24)} hari lalu`;
  }
  return tanggal;
}

export default function NotifPopup({
  unread,
  loading,
  items,
  onRead,
  onDelete,
  onClose,
}: {
  unread: number;
  loading: boolean;
  items: PesanRow[] | null;
  onRead: (row: PesanRow) => void;
  onDelete: (row: PesanRow) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="animate-menu absolute top-full right-0 z-50 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/20 sm:w-96 dark:border-night-700 dark:bg-night-900 dark:shadow-black/50">
      {/* Kepala panel */}
      <div className="flex items-center gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-transparent px-4 py-3 dark:border-night-700 dark:from-night-800 dark:via-night-800/50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
          <Bell className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-emerald-950 dark:text-emerald-100">
            Notifikasi
          </span>
          <span className="block text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
            {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
          </span>
        </span>
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        <button
          type="button"
          aria-label="Tutup notifikasi"
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
              Belum ada notifikasi
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Kabar terbaru tentang adopsi Anda akan muncul di sini.
            </p>
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
                  title={baru ? "Tandai sudah dibaca" : undefined}
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
                      {waktuLalu(row.tanggal)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Hapus notifikasi ${row.id}`}
                  title="Hapus notifikasi"
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
        onClick={onClose}
        className="group flex items-center justify-center gap-1.5 border-t border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 px-4 py-3 text-xs font-bold text-emerald-700 transition-colors hover:from-emerald-100 hover:to-teal-100 dark:border-night-700 dark:from-night-800/60 dark:to-night-800/30 dark:text-emerald-300 dark:hover:from-night-800 dark:hover:to-night-800"
      >
        Lihat semua notifikasi
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
