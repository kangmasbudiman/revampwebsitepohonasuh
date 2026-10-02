import Link from "next/link";
import {
  BadgeCheck,
  Coins,
  HeartHandshake,
  Sprout,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import { apiGet, adoptionStatus, mapDesa, mapOrderRows, type ApiOrderRow } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { rupiah, tanggal, ADOPTION_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";

export const metadata = { title: "Admin — Ringkasan" };

export default async function AdminHomePage() {
  await requireAdminLevel();

  let rows: ApiOrderRow[] = [];
  let available = 0;
  let adopted = 0;
  try {
    rows = mapOrderRows(await apiGet<Record<string, unknown>[]>("ordercustomer"));
    for (const d of (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa)) {
      available += d.available;
      adopted += d.adopted;
    }
  } catch {
    // tampilkan ringkasan kosong di bawah
  }

  const pendingIds = new Set(
    rows
      .filter((r) => r.confirmation === "no" && r.fotoBuktiUrl)
      .map((r) => r.confirmasiId),
  );
  const activeCount = rows.filter((r) => r.confirmation === "yes").length;
  const income = new Map(
    rows.filter((r) => r.confirmation === "yes").map((r) => [r.invoice, r.total]),
  );
  const totalIncome = [...income.values()].reduce((sum, v) => sum + v, 0);

  const stats: {
    label: string;
    value: number;
    href: string;
    icon: LucideIcon;
    grad: string;
    shadow: string;
  }[] = [
    {
      label: "Menunggu Verifikasi",
      value: pendingIds.size,
      href: "/admin/verifikasi",
      icon: BadgeCheck,
      grad: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/30",
    },
    {
      label: "Pohon Teradopsi (order)",
      value: activeCount,
      href: "/admin/verifikasi",
      icon: HeartHandshake,
      grad: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
    },
    {
      label: "Pohon Tersedia",
      value: available,
      href: "/admin/pohon",
      icon: Sprout,
      grad: "from-sky-500 to-cyan-500",
      shadow: "shadow-sky-500/30",
    },
    {
      label: "Pohon Teradopsi",
      value: adopted,
      href: "/admin/pohon",
      icon: TreePine,
      grad: "from-violet-500 to-fuchsia-500",
      shadow: "shadow-violet-500/30",
    },
  ];

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-bold pa-hgrad">Ringkasan Admin</h1>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${stat.grad} ${stat.shadow}`}
            >
              <Icon
                aria-hidden
                className="absolute -right-4 -bottom-5 h-24 w-24 text-white/15 transition-transform duration-300 group-hover:scale-110"
              />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
              </span>
              <p className="relative mt-4 text-sm font-medium text-white/85">{stat.label}</p>
              <p className="relative mt-1 text-3xl font-extrabold tracking-tight">{stat.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 p-6 text-white shadow-lg shadow-emerald-900/30">
        <div
          aria-hidden
          className="absolute -top-10 right-10 h-32 w-32 rounded-full border-[10px] border-white/10"
        />
        <div
          aria-hidden
          className="absolute -bottom-14 right-28 h-36 w-36 rounded-full border-[12px] border-white/5"
        />
        <p className="relative flex items-center gap-2 text-sm font-medium text-emerald-100/80">
          <Coins className="h-4 w-4" /> Total Dana Adopsi Terkumpul
        </p>
        <p className="relative mt-1 text-3xl font-extrabold tracking-tight text-white">
          {rupiah(totalIncome)}
        </p>
      </div>

      {pendingIds.size > 0 && (
        <Link
          href="/admin/verifikasi"
          className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 text-white shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          <p className="text-sm font-semibold">
            Ada {pendingIds.size} pembayaran menunggu verifikasi.
          </p>
          <span className="text-sm font-bold">Verifikasi sekarang →</span>
        </Link>
      )}

      <h2 className="mt-10 text-xl font-bold pa-hgrad">Adopsi Terbaru</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="pa-thead ">
            <tr>
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Donatur</th>
              <th className="px-4 py-3 font-semibold">Pohon</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800 pa-card">
            {rows.slice(0, 8).map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.idpohon}</td>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{r.nama}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  {r.localName} <span className="text-zinc-400 dark:text-zinc-500">({r.idpohon})</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {r.tglAdopt ? tanggal(new Date(r.tglAdopt)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    {...(ADOPTION_STATUS[adoptionStatus(r.confirmation, !!r.fotoBuktiUrl)] ?? {
                      label: r.confirmation,
                      className: "bg-zinc-100 text-zinc-600 dark:text-zinc-300",
                    })}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada adopsi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
