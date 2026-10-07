"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, Leaf, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { Session } from "@/lib/auth";
import Avatar from "@/components/avatar";
import CartBadge from "@/components/cart-badge";
import MemberBell from "@/components/member-bell";
import LangToggle from "@/components/lang-toggle";
import { useI18n } from "@/components/i18n-provider";

export default function SiteHeader({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const NAV = [
    { href: "/", label: dict.nav.home },
    { href: "/pohon", label: dict.nav.trees },
    { href: "/spesies", label: dict.nav.species },
    { href: "/kalkulator-karbon", label: dict.nav.carbonCalc },
    { href: "/lokasi", label: dict.nav.locations },
    { href: "/blog", label: dict.nav.blog },
  ];
  // Menu sekunder — dropdown "Informasi" agar bar utama tidak dempet.
  const INFO_NAV = [
    { href: "/faq", label: dict.nav.faq },
    { href: "/keuangan", label: dict.nav.finance },
    { href: "/kontak", label: dict.nav.contact },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHome = pathname === "/";
  const overlay = isHome && !scrolled && !open;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const infoActive = INFO_NAV.some((item) => isActive(item.href));

  const linkBase =
    "relative px-1 py-2 text-sm font-medium transition-colors after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:transition-all after:duration-300 hover:after:w-full";
  const linkCls = overlay
    ? `${linkBase} text-white/80 hover:text-white after:bg-white`
    : `${linkBase} text-emerald-900/75 hover:text-emerald-900 after:bg-emerald-500`;
  const linkActive = overlay ? "text-white after:w-full" : "text-emerald-700 after:w-full";

  const dashboardHref = session?.role === "ADMIN" ? "/admin" : "/dashboard";
  const dashboardLabel = session?.role === "ADMIN" ? dict.nav.adminPanel : dict.nav.dashboard;
  const DashboardIcon = session?.role === "ADMIN" ? ShieldCheck : LayoutDashboard;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        overlay
          ? "bg-transparent"
          : "border-b border-emerald-100 bg-white/90 shadow-sm backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 xl:max-w-7xl">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="group flex items-center gap-2.5"
        >
          <span className="shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            <Image
              src="/images/logo_icon.png"
              alt="Logo Pohon Asuh"
              width={38}
              height={38}
              className={`rounded-full object-contain ring-2 transition-all ${
                overlay ? "shadow-lg ring-white/70" : "shadow-sm ring-emerald-100"
              }`}
            />
          </span>
          <span
            className={`whitespace-nowrap text-lg font-bold tracking-tight transition-colors ${
              overlay ? "text-white" : "text-emerald-900"
            }`}
          >
            Pohon Asuh
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${linkCls} ${isActive(item.href) ? linkActive : ""} whitespace-nowrap`}
            >
              {item.label}
            </Link>
          ))}

          <div className="group relative">
            <button
              type="button"
              className={`${linkCls} ${infoActive ? linkActive : ""} flex items-center gap-1 whitespace-nowrap`}
            >
              {dict.nav.info}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180 ${
                  overlay ? "text-white/70" : "text-emerald-700"
                }`}
              />
            </button>
            <div className="invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="w-44 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl shadow-emerald-900/10">
                {INFO_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-emerald-900 hover:bg-emerald-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <LangToggle overlay={overlay} />
          <CartBadge overlay={overlay} />
          {session && <MemberBell overlay={overlay} />}
          {session ? (
            <div className="group relative">
              <button
                type="button"
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors ${
                  overlay ? "hover:bg-white/10" : "hover:bg-emerald-50"
                }`}
              >
                <Avatar src={session.photo} name={session.name} size={36} />
                <span
                  className={`max-w-[10ch] truncate text-sm font-medium ${
                    overlay ? "text-white" : "text-emerald-950"
                  }`}
                >
                  {session.name}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 group-hover:rotate-180 ${
                    overlay ? "text-white/70" : "text-emerald-700"
                  }`}
                />
              </button>

              <div className="invisible absolute right-0 top-full translate-y-1 pt-2 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl shadow-emerald-900/10">
                  <div className="px-3 pb-2 pt-2">
                    <p className="truncate text-sm font-semibold text-emerald-950">{session.name}</p>
                    <p className="text-xs text-zinc-400">
                      {session.role === "ADMIN" ? dict.nav.administrator : dict.nav.donor}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-emerald-50" />
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
                  >
                    <DashboardIcon className="h-4 w-4 text-emerald-600" />
                    {dashboardLabel}
                  </Link>
                  <Link
                    href="/dashboard/profil"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
                  >
                    <UserRound className="h-4 w-4 text-emerald-600" />
                    {dict.nav.profile}
                  </Link>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {dict.nav.logout}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/masuk"
                className={`text-sm font-medium transition-colors ${
                  overlay ? "text-white/85 hover:text-white" : "text-emerald-900 hover:text-emerald-700"
                }`}
              >
                Masuk
              </Link>
              <Link
                href="/daftar"
                className={`group flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-300 hover:scale-105 ${
                  overlay
                    ? "bg-white text-emerald-800 shadow-emerald-950/20 hover:bg-emerald-50"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-400"
                }`}
              >
                <Leaf className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                {dict.nav.register}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={dict.nav.openMenu}
          aria-expanded={open}
          className={`rounded-lg p-2 transition-colors xl:hidden ${
            overlay ? "text-white hover:bg-white/10" : "text-emerald-900 hover:bg-emerald-50"
          }`}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="animate-menu absolute inset-x-0 top-16 border-b border-emerald-100 bg-white shadow-lg xl:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow"
                    : "text-emerald-900 hover:bg-emerald-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
              {dict.nav.info}
            </p>
            {INFO_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow"
                    : "text-emerald-900 hover:bg-emerald-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {session && (
              <Link
                href="/dashboard/profil"
                onClick={() => setOpen(false)}
                className={`mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/dashboard/profil")
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow"
                    : "text-emerald-900 hover:bg-emerald-50"
                }`}
              >
                <UserRound className="h-4 w-4" />
                {dict.nav.profile}
              </Link>
            )}
            <div className="mt-2 flex items-center gap-2 border-t border-emerald-100 pt-3">
              <LangToggle />
              <CartBadge onNavigate={() => setOpen(false)} />
              {session && <MemberBell onNavigate={() => setOpen(false)} popupUp />}
              {session ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2.5 text-sm font-semibold text-white shadow"
                  >
                    <DashboardIcon className="h-4 w-4" />
                    {dashboardLabel}
                  </Link>
                  <form action={logout} className="flex-1">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      {dict.nav.logout}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/masuk"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-emerald-200 px-3 py-2.5 text-center text-sm font-medium text-emerald-800"
                  >
                    {dict.nav.login}
                  </Link>
                  <Link
                    href="/daftar"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2.5 text-center text-sm font-semibold text-white shadow"
                  >
                    {dict.nav.register}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
