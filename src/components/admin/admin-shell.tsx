"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  PanelLeft,
  Search,
  Maximize2,
  Minimize2,
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import Avatar from "@/components/avatar";
import AdminNav, { AdminNavMobile, AdminSidebarFooter } from "@/components/admin/admin-nav";
import ThemeToggle from "@/components/admin/theme-toggle";
import GlobalSearch from "@/components/admin/global-search";
import NotificationBell from "@/components/admin/notification-bell";

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/images/logo_pohonasuh_baru_hijau.jpg"
        alt="Logo Pohon Asuh"
        width={34}
        height={34}
        className="rounded-full object-cover ring-2 ring-emerald-400/50"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-bold tracking-tight text-white">Pohon Asuh</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">
          Panel Admin
        </span>
      </span>
    </span>
  );
}

type OpenMenu = "profile" | "notif" | null;

// Kerangka admin: sidebar desktop (collapsible) + drawer mobile + top nav
// bar (search global, tema, notifikasi pesan, fullscreen, profil, gear).
export default function AdminShell({
  name,
  level,
  userId,
  photo,
  children,
}: {
  name: string;
  level?: number;
  userId: number;
  photo?: string | null;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [kbd, setKbd] = useState<string | null>(null);

  const isAdmin = (level ?? 1) === 1;

  // Ctrl/⌘+K buka pencarian global; Escape menutup semua lapisan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setOpenMenu(null);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setDrawerOpen(false);
        setOpenMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Kunci scroll body saat drawer/dialog terbuka.
  useEffect(() => {
    const kunci = drawerOpen || searchOpen;
    document.body.style.overflow = kunci ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, searchOpen]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Label pintasan dihitung setelah mount agar SSR/CSR identik.
  useEffect(() => {
    setKbd(/mac/i.test(navigator.userAgent) ? "⌘ K" : "Ctrl K");
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSidebarOpen((v) => !v);
    } else {
      setDrawerOpen(true);
    }
  };

  // Panel sidebar selalu gelap (gradasi emerald) di kedua tema — jadi
  // kontennya memakai warna-gelap tanpa varian dark:.
  const sidebarInner = (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <a href="/admin">
          <Brand />
        </a>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminNav level={level} />
        </div>
        <AdminSidebarFooter name={name} level={level} />
      </div>
    </>
  );

  return (
    <div className="pa-page flex min-h-dvh font-sans text-zinc-900 transition-colors">
      {sidebarOpen && (
        <aside className="hidden w-64 shrink-0 md:flex md:flex-col print:hidden">
          <div className="relative sticky top-0 flex h-dvh flex-col overflow-hidden border-r border-emerald-950/60 bg-gradient-to-b from-emerald-900 via-emerald-950 to-[#06231a]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-teal-400/10 to-transparent blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
            />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">{sidebarInner}</div>
          </div>
        </aside>
      )}

      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Tutup menu samping"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/40 md:hidden print:hidden"
          />
          <aside className="animate-menu fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-emerald-950/60 bg-gradient-to-b from-emerald-900 via-emerald-950 to-[#06231a] md:hidden print:hidden">
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pr-2 pl-4 py-4">
                <a href="/admin">
                  <Brand />
                </a>
                <button
                  type="button"
                  aria-label="Tutup menu"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-emerald-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <AdminNav level={level} />
                </div>
                <AdminSidebarFooter name={name} level={level} />
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-gradient-to-r from-white/90 via-emerald-50/70 to-teal-50/80 backdrop-blur-md print:hidden dark:border-night-700 dark:from-night-900/90 dark:via-night-900/80 dark:to-night-950/90">
          <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Buka atau tutup menu samping"
              title="Menu samping"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-night-700"
            >
              <PanelLeft className="h-[1.1em] w-[1.1em]" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  setOpenMenu(null);
                }}
                aria-label="Cari di seluruh sistem"
                className="flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 text-sm text-zinc-500 transition-colors hover:border-emerald-300 hover:bg-emerald-100/60 dark:border-night-700 dark:bg-night-800/60 dark:text-zinc-400 dark:hover:bg-night-700"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Cari…</span>
                {kbd && (
                  <kbd className="hidden rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 md:inline dark:border-night-700 dark:bg-night-900">
                    {kbd}
                  </kbd>
                )}
              </button>
              <ThemeToggle className="h-9 w-9" />
              <NotificationBell
                open={openMenu === "notif"}
                onOpenChange={(o) => setOpenMenu(o ? "notif" : null)}
              />
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Layar penuh"
                title="Layar penuh"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100 sm:inline-flex dark:text-emerald-300 dark:hover:bg-night-700"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-[1.1em] w-[1.1em]" />
                ) : (
                  <Maximize2 className="h-[1.1em] w-[1.1em]" />
                )}
              </button>
              {isAdmin && (
                <Link
                  href="/admin/pengaturan"
                  aria-label="Pengaturan"
                  title="Pengaturan"
                  className="hidden h-9 w-9 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100 sm:inline-flex dark:text-emerald-300 dark:hover:bg-night-700"
                >
                  <Settings className="h-[1.1em] w-[1.1em]" />
                </Link>
              )}
              <span className="mx-1 h-6 w-px bg-emerald-100 dark:bg-night-700" aria-hidden />
              <div className="relative">
                <button
                  type="button"
                  aria-label="Menu profil"
                  aria-expanded={openMenu === "profile"}
                  onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
                  className="flex h-9 items-center gap-2 rounded-full pr-2 pl-0.5 transition-colors hover:bg-emerald-100 dark:hover:bg-night-700"
                >
                  <Avatar src={photo} name={name} size={32} className="shadow-md shadow-emerald-500/30" />
                  <span className="hidden max-w-32 truncate text-sm font-medium text-emerald-950 md:block dark:text-emerald-50">
                    {name}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
                      openMenu === "profile" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openMenu === "profile" && (
                  <div className="animate-menu pa-card absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-emerald-100 shadow-xl dark:border-night-700">
                    <div className="border-b border-emerald-100 px-4 py-3 dark:border-night-700">
                      <p className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-50">
                        {name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {level === 2 ? "Petugas" : "Admin"} · ID {userId}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/profil"
                      onClick={() => setOpenMenu(null)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
                    >
                      <UserRound className="h-4 w-4" /> Profil
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/pengaturan"
                        onClick={() => setOpenMenu(null)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
                      >
                        <Settings className="h-4 w-4" /> Pengaturan
                      </Link>
                    )}
                    <form action={logout}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <LogOut className="h-4 w-4" /> Keluar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto border-t border-emerald-100 px-4 py-2 md:hidden dark:border-night-700">
            <AdminNavMobile level={level} />
          </nav>
        </header>
        {children}
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
