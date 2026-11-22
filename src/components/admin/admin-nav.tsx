"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  BadgeDollarSign,
  Ban,
  BadgeCheck,
  BookHeart,
  ChevronDown,
  Clock,
  ShoppingCart,
  ClipboardCheck,
  CircleHelp,
  Coins,
  DatabaseBackup,
  Flag,
  Handshake,
  HeartHandshake,
  History,
  Images,
  Info,
  LayoutDashboard,
  LayoutTemplate,
  Leaf,
  LogOut,
  Map,
  MapPin,
  MapPinned,
  MessageSquareQuote,
  Newspaper,
  NotebookPen,
  Paperclip,
  Settings,
  Share2,
  ShieldCheck,
  Snowflake,
  Sprout,
  Tag,
  TreePine,
  Upload,
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
    title: "Dashboard",
    items: [
      { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/admin/pemantauan", label: "Pemantauan", icon: Activity },
    ],
  },
  {
    title: "Transaksi & Adopsi",
    items: [
      { href: "/admin/verifikasi", label: "Verifikasi Pembayaran", icon: BadgeCheck },
      { href: "/admin/adopsi", label: "Data Adopsi", icon: HeartHandshake },
      { href: "/admin/tagging", label: "Order Tagging", icon: Tag },
      { href: "/admin/sertifikat", label: "Kelola Sertifikat", icon: Award },
    ],
  },
  {
    title: "Laporan & Keuangan",
    items: [
      { href: "/admin/btor", label: "Laporan BTOR", icon: ClipboardCheck },
      { href: "/admin/laporan", label: "Laporan Kegiatan", icon: NotebookPen },
      { href: "/admin/keuangan", label: "Kelola Keuangan", icon: Wallet },
      { href: "/admin/sumber-info", label: "Asal Tahu Pengguna", icon: MessageSquareQuote },
    ],
  },
  {
    title: "Manajemen Mitra",
    items: [
      { href: "/admin/pendaftaran-organisasi", label: "Pendaftaran Organisasi", icon: ClipboardCheck },
      { href: "/admin/mitra", label: "Data Mitra", icon: Handshake },
      { href: "/admin/program-mitra", label: "Program Mitra", icon: Sprout },
      { href: "/admin/pesanan-mitra", label: "Pesanan Pohon", icon: ShoppingCart },
      { href: "/admin/mitra-requests", label: "Request Hold Mitra", icon: Clock },
      { href: "/admin/adopsi-mitra", label: "Input Data Pengadopsi", icon: Upload },
      { href: "/admin/verifikasi-adopsi-mitra", label: "Verifikasi Adopsi Mitra", icon: BadgeCheck },
      { href: "/admin/bukti-transfer-mitra", label: "Bukti Transfer Mitra", icon: Paperclip },
    ],
  },
  {
    title: "Data Pohon & Wilayah",
    items: [
      { href: "/admin/pohon", label: "Kelola Pohon", icon: TreePine },
      { href: "/admin/pohon/beku", label: "Pembekuan Pohon", icon: Snowflake },
      { href: "/admin/spesies", label: "Kelola Spesies", icon: Leaf },
      { href: "/admin/lokasi", label: "Data Lokasi", icon: MapPinned },
      { href: "/admin/provinsi", label: "Kelola Provinsi", icon: Flag },
      { href: "/admin/peta", label: "Kelola Peta Desa", icon: Map },
      { href: "/admin/harga", label: "Data Harga Pohon", icon: Coins },
    ],
  },
  {
    title: "Operasional Lapangan",
    items: [
      { href: "/admin/penugasan", label: "Penugasan Petugas", icon: UserCog },
      { href: "/admin/posisi", label: "Posisi Petugas", icon: MapPin },
    ],
  },
  {
    title: "Konten Website",
    items: [
      { href: "/admin/blog", label: "Kelola Blog", icon: Newspaper },
      { href: "/admin/cerita", label: "Cerita Dampak", icon: BookHeart },
      { href: "/admin/slider", label: "Kelola Slider", icon: Images },
      { href: "/admin/tentang", label: "Tentang Pohon Asuh", icon: Info },
      { href: "/admin/faq", label: "Kelola FAQ", icon: CircleHelp },
    ],
  },
  {
    title: "Template & Testimoni",
    items: [
      { href: "/admin/template-sertifikat", label: "Template Sertifikat", icon: LayoutTemplate },
      { href: "/admin/template-share", label: "Template Share", icon: Share2 },
      { href: "/admin/testimoni", label: "Testimoni & Partner", icon: MessageSquareQuote },
    ],
  },
  {
    title: "Pengaturan Sistem",
    items: [
      { href: "/admin/user", label: "Kelola User", icon: Users },
      { href: "/admin/role", label: "Kelola Role & Hak Akses", icon: ShieldCheck },
      { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
      { href: "/admin/backup", label: "Backup Database", icon: DatabaseBackup },
    ],
  },
];

// Petugas (level 2): Order Tagging, BTOR miliknya, laporan kegiatan sendiri,
// + peta offline.
const PETUGAS_HREFS = new Set([
  "/admin/tagging",
  "/admin/btor",
  "/admin/laporan",
  "/admin/peta",
  "/admin/pohon/beku",
]);
const MITRA_HREFS = new Set([
  "/mitra",
  "/mitra/program",
  "/mitra/pesanan",
  "/mitra/riwayat-pesanan",
  "/mitra/tagihan",
  "/mitra/pembatalan",
  "/mitra/desain-tagging",
  "/mitra/adopsi",
  "/mitra/laporan",
  "/mitra/sertifikat",
  "/mitra/pengaturan",
]);
const MITRA_ITEMS: Item[] = [
  { href: "/mitra", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mitra/program", label: "Program Saya", icon: BookHeart },
  { href: "/mitra/pesanan", label: "Pemesanan Pohon", icon: TreePine },
  { href: "/mitra/riwayat-pesanan", label: "Riwayat Pemesanan", icon: History },
  { href: "/mitra/adopsi", label: "Data Pengadopsi", icon: HeartHandshake },
  { href: "/mitra/tagihan", label: "Tagihan Adopsi", icon: BadgeDollarSign },
  { href: "/mitra/pembatalan", label: "Pembatalan Program", icon: Ban },
  { href: "/mitra/desain-tagging", label: "Desain Tagging", icon: Share2 },
  { href: "/mitra/laporan", label: "Laporan", icon: ClipboardCheck },
  { href: "/mitra/sertifikat", label: "Sertifikat", icon: Award },
  { href: "/mitra/pengaturan", label: "Pengaturan", icon: Settings },
];
const ALL_ITEMS: Item[] = [...GROUPS.flatMap((g) => g.items), ...MITRA_ITEMS];

// Item aktif = pencocokan pathname TERPANJANG di antara semua menu, agar
// /admin/pohon/beku tidak ikut menyalakan /admin/pohon (dan sebaliknya
// halaman detail /admin/pohon/[id] tetap menyalakan /admin/pohon).
const isActive = (href: string, pathname: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

const hrefAktif = (pathname: string) => {
  const cocok = ALL_ITEMS.filter((i) => isActive(i.href, pathname));
  if (cocok.length === 0) return null;
  // pilih href terpanjang (paling spesifik)
  return cocok.reduce((a, b) => (b.href.length > a.href.length ? b : a)).href;
};

// Chip ikon menu: kotak kecil rounded agar tiap baris menu punya jangkar
// visual sendiri — sidebar gelap, jadi warnanya fixed.
function NavIcon({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 transition-all ${
        active
          ? "bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-900/40 ring-emerald-400/60"
          : "bg-emerald-800/60 text-emerald-200 ring-emerald-600/40 hover:bg-emerald-800/80"
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

// Badge penanda admin (amber): BTOR menunggu verifikasi + permintaan tagging
// menunggu acc — di baris menu terkait.
const badgeCls =
  "ml-auto rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950";

function NavBadge({
  item,
  btorTerkirim,
  taggingMenunggu,
}: {
  item: Item;
  btorTerkirim?: number;
  taggingMenunggu?: number;
}) {
  const isBtor = item.href === "/admin/btor";
  const n = isBtor ? btorTerkirim : item.href === "/admin/tagging" ? taggingMenunggu : undefined;
  if (!n) return null;
  return (
    <span className={badgeCls} data-testid={isBtor ? "nav-badge-btor" : "nav-badge-tagging"}>
      {n}
    </span>
  );
}

export default function AdminNav({
  level,
  mitra,
  btorTerkirim,
  taggingMenunggu,
}: {
  level?: number;
  mitra?: boolean;
  btorTerkirim?: number;
  taggingMenunggu?: number;
}) {
  const pathname = usePathname();
  const aktif = hrefAktif(pathname);
  // Grup yang memuat halaman aktif terbuka secara bawaan; sisanya collapsed.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      GROUPS.map((g) => [g.title, g.items.some((i) => i.href === aktif)]),
    ),
  );

  if (level === 2 || mitra) {
    const hrefs = mitra ? MITRA_HREFS : PETUGAS_HREFS;
    return (
      <nav className="space-y-1">
        {ALL_ITEMS.filter((i) => hrefs.has(i.href)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemCls(item.href === aktif)}
          >
            <NavIcon item={item} active={item.href === aktif} />
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
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-100 transition-colors hover:bg-white/5 hover:text-emerald-200"
            >
              <span className="flex items-center gap-2">
                {group.items[0]?.icon && (() => {
              const GroupIcon = group.items[0].icon;
              return <GroupIcon className="h-3.5 w-3.5 text-emerald-300/70" aria-hidden />;
            })()}
                {group.title}
              </span>
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
                    className={itemCls(item.href === aktif)}
                  >
                    <NavIcon item={item} active={isActive(item.href, pathname)} />
                    {item.label}
                    <NavBadge item={item} btorTerkirim={btorTerkirim} taggingMenunggu={taggingMenunggu} />
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
    <div className="mt-2 shrink-0 border-t border-white/10 pt-3" />
  );
}

// Versi chip horizontal untuk layar kecil (tanpa judul grup).
export function AdminNavMobile({
  level,
  mitra,
  btorTerkirim,
  taggingMenunggu,
}: {
  level?: number;
  mitra?: boolean;
  btorTerkirim?: number;
  taggingMenunggu?: number;
}) {
  const pathname = usePathname();
  const aktifMobile = hrefAktif(pathname);

  const items = mitra
    ? MITRA_ITEMS
    : level === 2
      ? ALL_ITEMS.filter((i) => PETUGAS_HREFS.has(i.href))
      : ALL_ITEMS;

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const badge =
          item.href === "/admin/btor"
            ? btorTerkirim
            : item.href === "/admin/tagging"
              ? taggingMenunggu
              : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium ${
              item.href === aktifMobile
                ? "pa-btn-primary text-white"
                : "text-emerald-800 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-night-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
            {!!badge && (
              <span
                className="rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950"
                data-testid={item.href === "/admin/btor" ? "nav-badge-btor" : "nav-badge-tagging"}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
