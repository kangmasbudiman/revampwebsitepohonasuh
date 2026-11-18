"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import LangToggle from "@/components/lang-toggle";
import type { Session } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

export default function MitraNav({ session = null }: { session?: Session | null }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b border-emerald-100">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <Link href="/kerjasama-mitra" className="flex shrink-0 items-center gap-2" aria-label="Pohon Asuh — Kerjasama Mitra">
          <Image src="/images/logo_icon.png" alt="Pohon Asuh" width={36} height={36} className="rounded-full" />
          <span className="text-lg font-extrabold text-emerald-900">Pohon Asuh</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600">
          <Link href="/kerjasama-mitra#mengapa">Mengapa Mitra</Link>
          <Link href="/kerjasama-mitra#siapa">Siapa yang Bisa</Link>
          <Link href="/kerjasama-mitra#cara">Cara Kerja</Link>
          <Link href="/kerjasama-mitra#faq">FAQ</Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LangToggle />
          {session ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-1 pr-2.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
                aria-label="Menu"
                aria-expanded={open}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-extrabold text-white">
                  {(session.name || "M").charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[90px] truncate sm:inline">{session.name}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {open && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default bg-transparent" onClick={() => setOpen(false)} aria-label="Tutup menu" />
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl shadow-emerald-900/10">
                    <Link href="/mitra" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-emerald-50">
                      <LayoutDashboard className="h-4 w-4 text-emerald-700" aria-hidden /> Dashboard Mitra
                    </Link>
                    <form action={logout}>
                      <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-700 transition hover:bg-red-50 hover:text-red-700">
                        <LogOut className="h-4 w-4" aria-hidden /> Keluar
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/masuk" className="text-xs font-semibold text-emerald-900 transition hover:text-emerald-700 sm:text-sm">
              Masuk
            </Link>
          )}
          <Link href="/daftar-mitra" className="rounded-full bg-emerald-500 px-3 py-2 text-[10px] sm:px-6 sm:py-2.5 sm:text-xs font-bold text-white shadow-emerald-900/40 hover:bg-emerald-400 transition-all hover:scale-[1.03]">
            Daftar →
          </Link>
        </div>
      </div>
    </header>
  );
}
