"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  getUnreadPesan,
  hapusPesan,
  listPesan,
  markPesanRead,
  type PesanRow,
} from "@/lib/actions/pesan";
import NotifPopup from "@/components/notif-popup";

const MAX_TAMPIL = 8;

// Lonceng notifikasi top bar: badge pesan belum dibaca + dropdown daftar
// pesan terbaru (pesan_notif utk admin/petugas yang login). Tanpa polling —
// refresh saat dibuka. Pesan diambil dari sesi login (lihat actions/pesan).
export default function NotificationBell({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<PesanRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let batal = false;
    getUnreadPesan().then((n) => {
      if (!batal) setUnread(n);
    });
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let batal = false;
    Promise.all([listPesan(), getUnreadPesan()]).then(([rows, n]) => {
      if (batal) return;
      setItems(rows.slice(0, MAX_TAMPIL));
      setUnread(n);
      setLoading(false);
    });
    return () => {
      batal = true;
    };
  }, [open]);

  // Klik di luar dropdown → tutup.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const tandaiDibaca = (row: PesanRow) => {
    if (row.status !== "noread") return;
    setItems((its) =>
      its ? its.map((i) => (i.id === row.id ? { ...i, status: "read" } : i)) : its,
    );
    setUnread((n) => Math.max(0, n - 1));
    void markPesanRead(row.id);
  };

  const hapus = (row: PesanRow) => {
    setItems((its) => (its ? its.filter((i) => i.id !== row.id) : its));
    if (row.status === "noread") setUnread((n) => Math.max(0, n - 1));
    void hapusPesan(row.id);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifikasi"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-night-700"
      >
        <Bell className="h-[1.1em] w-[1.1em]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <NotifPopup
          unread={unread}
          loading={loading}
          items={items}
          onRead={tandaiDibaca}
          onDelete={hapus}
          onClose={() => onOpenChange(false)}
        />
      )}
    </div>
  );
}
