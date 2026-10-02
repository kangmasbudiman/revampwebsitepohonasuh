"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  BadgeCheck,
  ChevronDown,
  Coins,
  DatabaseBackup,
  HeartHandshake,
  Images,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  MapPin,
  MapPinned,
  MessageSquareQuote,
  Newspaper,
  Settings,
  Tag,
  TreePine,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/lib/actions/auth";
import ThemeToggle from "@/components/admin/theme-toggle";

type Item = { href: string; label: string; icon: LucideIcon };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Operasional",
    items: [
      { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/admin/pemantauan", label: "Dashboard Pemantauan", icon: Activity },
      { href: "/admin/verifikasi", label: "Verifikasi Pembayaran", icon: BadgeCheck },
      { href: "/admin/tagging", label: "Order Tagging", icon: Tag },
      { href: "/admin/adopsi", label: "Data Adopsi", icon: HeartHandshake },
      { href: "/admin/penugasan", label: "Penugasan Petugas", icon: UserCog },
      { href: "/admin/posisi", label: "Posisi Petugas", icon: MapPin },
      { href: "/admin/peta", label: "Kelola Peta Desa", icon: Map },
      { href: "/admin/lokasi", label: "Data Lokasi", icon: MapPinned },
      { href: "/admin/harga", label: "Data Harga Pohon", icon: Coins },
    ],
  },
  {
    title: "Konten",
    items: [
      { href: "/admin/pohon", label: "Kelola Pohon", icon: TreePine },
      { href: "/admin/spesies", label: "Kelola Spesies", icon: Leaf },
      { href: "/admin/blog", label: "Kelola Blog", icon: Newspaper },
      { href: "/admin/slider", label: "Kelola Slider", icon: Images },
      { href: "/admin/sertifikat", label: "Kelola Sertifikat", icon: Award },
      { href: "/admin/testimoni", label: "Testimoni & Partner", icon: MessageSquareQuote },
    ],
  },
  {
    title: "Laporan & Pengaturan",
    items: [
      { href: "/admin/keuangan", label: "Kelola Keuangan", icon: Wallet },
      { href: "/admin/user", label: "Kelola User", icon: Users },
      { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
      { href: "/admin/backup", label: "Backup Database", icon: DatabaseBackup },
    ],
  },
];

// Petugas (level 2): Order Tagging + peta offline desa tugasnya.
const PETUGAS_HREFS = new Set(["/admin/tagging", "/admin/peta"]);
const ALL_ITEMS: Item[] = GROUPS.flatMap((g) => g.items);

const isActive = (href: string, pathname: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

// Chip ikon menu: kotak kecil rounded agar tiap baris menu punya jangkar
// visual sendiri — sidebar selalu gelap jadi warnanya fixed.
function NavIcon({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
        active
          ? "bg-white/25 text-white ring-white/30"
          : "bg-emerald-800/60 text-emerald-200 ring-emerald-600/40"
      }`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

// Kelas baris menu (dipakai grup admin & petugas): aktif = pil gradasi
// emerald→teal dengan bayangan, non-aktif = teks terang di atas panel gelap.
const itemCls = (active: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
    active
      ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-black/30 ring-1 ring-white/20"
      : "text-emerald-100/80 hover:bg-white/10 hover:text-white"
  }`;

export default function AdminNav({ level }: { level?: number }) {
  const pathname = usePathname();
  // Grup yang memuat halaman aktif terbuka secara bawaan; sisanya collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      GROUPS.map((g) => [g.title, g.items.some((i) => isActive(i.href, pathname))]),
    ),
  );

  if (level === 2) {
    return (
      <nav className="space-y-1">
        {ALL_ITEMS.filter((i) => PETUGAS_HREFS.has(i.href)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemCls(isActive(item.href, pathname))}
          >
            <NavIcon item={item} active={isActive(item.href, pathname)} />
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <>
      {GROUPS.map((group) => {
        const isOpen = open[group.title];
        return (
          <div key={group.title} className="mb-3">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [group.title]: !o[group.title] }))}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300/50 transition-colors hover:bg-white/5 hover:text-emerald-200"
            >
              {group.title}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <nav className="mt-1 space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={itemCls(isActive(item.href, pathname))}
                  >
                    <NavIcon item={item} active={isActive(item.href, pathname)} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        );
      })}
    </>
  );
}

// Footer sidebar: identitas, toggle tema, dan shortcut logout.
export function AdminSidebarFooter({ name, level }: { name: string; level?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mt-2 shrink-0 border-t border-white/10 pt-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 backdrop-blur">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white shadow-md shadow-black/20">
          {initials || "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{name}</span>
          <span className="block text-[11px] text-emerald-200/60">
            {level === 2 ? "Petugas" : "Admin"}
          </span>
        </span>
        <ThemeToggle onDark className="h-8 w-8 shrink-0" />
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </form>
    </div>
  );
}

// Versi chip horizontal untuk layar kecil (tanpa judul grup).
export function AdminNavMobile({ level }: { level?: number }) {
  const pathname = usePathname();

  const items = level === 2 ? ALL_ITEMS.filter((i) => PETUGAS_HREFS.has(i.href)) : ALL_ITEMS;

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              isActive(item.href, pathname)
                ? "pa-btn-primary text-white"
                : "text-emerald-800 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-night-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
