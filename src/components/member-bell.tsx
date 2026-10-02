"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import {
  getUnreadPesan,
  hapusPesan,
  listPesan,
  markPesanRead,
  type PesanRow,
} from "@/lib/actions/pesan";

const MAX_TAMPIL = 8;

// Lonceng notifikasi member di header publik: badge pesan belum dibaca
// (pesan_notif alamat ke member yang login) + dropdown daftar terbaru.
// overlay=true saat header transparan di atas hero beranda (teks putih).
export default function MemberBell({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
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
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          overlay
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        <Bell className="h-[1.1em] w-[1.1em]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-menu absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-xl shadow-emerald-900/10">
          <p className="border-b border-emerald-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-600/70">
            Notifikasi {unread > 0 && <span className="text-red-500">({unread} baru)</span>}
          </p>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">Memuat…</p>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-400">
                Tidak ada notifikasi.
              </p>
            ) : (
              items.map((row) => (
                <div
                  key={row.id}
                  className="group/item flex items-start border-b border-emerald-50 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => tandaiDibaca(row)}
                    title={row.status === "noread" ? "Tandai sudah dibaca" : undefined}
                    className="flex min-w-0 flex-1 items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-emerald-50/70"
                  >
                    {row.status === "noread" && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                    <span className="min-w-0">
                      <span
                        className={`line-clamp-2 text-sm ${
                          row.status === "noread" ? "font-medium text-zinc-800" : "text-zinc-500"
                        }`}
                      >
                        {row.pesan}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">
                        {row.tanggal ?? ""}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus notifikasi ${row.id}`}
                    title="Hapus notifikasi"
                    onClick={() => hapus(row)}
                    className="mr-2 mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <Link
            href="/dashboard/notifikasi"
            onClick={() => setOpen(false)}
            className="block border-t border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-center text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            Lihat semua notifikasi →
          </Link>
        </div>
      )}
    </div>
  );
}
