"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import LangToggle from "@/components/lang-toggle";
import type { Session } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const NAV_LINKS = [
  { href: "/kerjasama-mitra#mengapa", label: "Mengapa Mitra" },
  { href: "/kerjasama-mitra#siapa", label: "Siapa yang Bisa" },
  { href: "/kerjasama-mitra#cara", label: "Cara Kerja" },
  { href: "/kerjasama-mitra#faq", label: "FAQ" },
];

export default function MitraNav({ session = null }: { session?: Session | null }) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/80 backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:py-3">
        <Link href="/kerjasama-mitra" className="flex shrink-0 items-center gap-2" aria-label="Pohon Asuh — Kerjasama Mitra">
          <Image src="/images/logo_icon.png" alt="Pohon Asuh" width={36} height={36} className="rounded-full" />
          <span className="text-lg font-extrabold text-emerald-900">Pohon Asuh</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-zinc-600 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
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
            <Link href="/masuk" className="hidden text-sm font-semibold text-emerald-900 transition hover:text-emerald-700 sm:inline">
              Masuk
            </Link>
          )}
          <Link href="/daftar-mitra" className="rounded-full bg-emerald-500 px-3 py-2 text-[10px] font-bold text-white shadow-emerald-900/40 transition-all hover:scale-[1.03] hover:bg-emerald-400 sm:px-6 sm:py-2.5 sm:text-xs">
            Daftar →
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-emerald-900 transition-colors hover:bg-emerald-50 md:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="animate-menu absolute inset-x-0 top-full z-40 border-b border-emerald-100 bg-white shadow-lg md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-emerald-100 pt-2">
              {session ? (
                <>
                  <Link
                    href="/mitra"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard Mitra
                  </Link>
                  <form action={logout}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">
                      <LogOut className="h-4 w-4" aria-hidden /> Keluar
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/masuk"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
