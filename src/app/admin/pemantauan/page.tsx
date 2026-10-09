import Link from "next/link";
import { BadgeCheck, Coins, MapPin, TrendingUp } from "lucide-react";
import {
  apiGet,
  mapDesa,
  mapOrderRows,
  mapPosisiPetugasList,
  pingEndpoint,
  adoptionStatus,
  type ApiDesa,
  type ApiOrderRow,
  type ApiPosisiPetugas,
} from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { namaDesa, rupiah, tanggal, ADOPTION_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import MonitorCharts from "@/components/admin/monitor-charts";

export const metadata = { title: "Dashboard Pemantauan | Pohon Asuh" };

const MONTH_LABEL = new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" });
const JAM_TAMPIL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function parseApiDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function PemantauanPage() {
  await requireAdminLevel();

  const [ordersRes, desaRes, posisiRes, pingSlider, pingDesa] = await Promise.all([
    apiGet<Record<string, unknown>[]>("ordercustomer").then(mapOrderRows, () => [] as ApiOrderRow[]),
    apiGet<Record<string, unknown>[]>("getdesa")
      .then((rs) => rs.map(mapDesa), () => [] as ApiDesa[]),
    apiGet<Record<string, unknown>[]>("posisipetugas")
      .then(mapPosisiPetugasList, () => [] as ApiPosisiPetugas[]),
    pingEndpoint("slider"),
    pingEndpoint("getdesa"),
  ]);

  const rows = ordersRes;
  const checkedAt = new Date();

  // ---- Derivasi seri 12 bulan ----
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const currentKey = monthKeys[monthKeys.length - 1];
  const prevKey = monthKeys[monthKeys.length - 2];

  const orderCount = new Map<string, number>(monthKeys.map((m) => [m, 0]));
  const donasiByMonth = new Map<string, Map<string, number>>(
    monthKeys.map((m) => [m, new Map()]),
  );
  const incomeAll = new Map<string, number>();
  const pendingSet = new Set<number>();

  for (const r of rows) {
    if (r.confirmation === "no" && r.fotoBuktiUrl) pendingSet.add(r.confirmasiId);
    if (r.confirmation === "yes" && r.confirmasiId > 0) {
      incomeAll.set(String(r.confirmasiId), r.total);
    }
    const d = parseApiDate(r.createdAt ?? r.tglAdopt);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!orderCount.has(key)) continue;
    orderCount.set(key, (orderCount.get(key) ?? 0) + 1);
    if (r.confirmation === "yes" && r.confirmasiId > 0) {
      donasiByMonth.get(key)!.set(String(r.confirmasiId), r.total);
    }
  }

  const monthly = monthKeys.map((m) => ({
    month: MONTH_LABEL.format(new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1)),
    order: orderCount.get(m) ?? 0,
    donasi: [...(donasiByMonth.get(m) ?? new Map()).values()].reduce((s, v) => s + v, 0),
  }));

  const orderNow = orderCount.get(currentKey) ?? 0;
  const orderPrev = orderCount.get(prevKey) ?? 0;
  const delta =
    orderPrev === 0 ? (orderNow > 0 ? 100 : 0) : Math.round(((orderNow - orderPrev) / orderPrev) * 100);

  const totalIncome = [...incomeAll.values()].reduce((s, v) => s + v, 0);

  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const petugasAktif = posisiRes.filter((p) => {
    const d = parseApiDate(p.updatedAt);
    return d !== null && checkedAt.getTime() - d.getTime() < SIX_HOURS;
  }).length;

  const proses = [
    { name: "Baru", value: rows.filter((r) => r.proses === 1).length },
    { name: "Diproses", value: rows.filter((r) => r.proses === 2).length },
    { name: "Selesai", value: rows.filter((r) => r.proses === 3).length },
  ];

  const desaChart = [...desaRes]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((d) => ({ name: namaDesa(d.name), tersedia: d.available, teradopsi: d.adopted }));

  const recent = [...rows].sort((a, b) => b.id - a.id).slice(0, 8);

  const kpis = [
    {
      label: "Donasi Terkumpul",
      value: rupiah(totalIncome),
      sub: "order terverifikasi",
      icon: Coins,
      grad: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
    },
    {
      label: "Order Bulan Ini",
      value: String(orderNow),
      sub: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs bulan lalu`,
      icon: TrendingUp,
      grad: "from-sky-500 to-cyan-500",
      shadow: "shadow-sky-500/30",
    },
    {
      label: "Menunggu Verifikasi",
      value: String(pendingSet.size),
      sub: "pembayaran donatur",
      icon: BadgeCheck,
      grad: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/30",
    },
    {
      label: "Petugas Melapor < 6 jam",
      value: `${petugasAktif}/${posisiRes.length}`,
      sub: "posisi GPS terakhir",
      icon: MapPin,
      grad: "from-violet-500 to-fuchsia-500",
      shadow: "shadow-violet-500/30",
    },
  ];

  const healths = [
    { label: "API Slider", ping: pingSlider },
    { label: "API Data Desa", ping: pingDesa },
  ];
  const apiOnline = healths.every((h) => h.ping.ok);

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold pa-hgrad">
            Dashboard Pemantauan
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pantau tren order, donasi, status proses, dan kesehatan API backend secara ringkas.
          </p>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Dicek {JAM_TAMPIL.format(checkedAt)} WIB
        </p>
      </div>

      {/* KPI */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg ${kpi.grad} ${kpi.shadow}`}
            >
              <Icon
                aria-hidden
                className="absolute -right-3 -bottom-4 h-20 w-20 text-white/15"
              />
              <div className="relative flex items-center justify-between">
                <p className="text-sm font-medium text-white/85">{kpi.label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="relative mt-2 truncate text-2xl font-extrabold tracking-tight">
                {kpi.value}
              </p>
              <p className="relative mt-1 text-xs font-medium text-white/75">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Health check API */}
      <div className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold pa-hgrad">
            Kesehatan API Backend
          </h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              apiOnline
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            {apiOnline ? "● Online" : "● Offline"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {healths.map((h) => (
            <div
              key={h.label}
              className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 dark:border-night-700 dark:bg-night-800/60"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{h.label}</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  h.ping.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"
                }`}
              >
                {h.ping.ok ? `${h.ping.ms} ms` : `Gagal${h.ping.status ? ` (${h.ping.status})` : ""}`}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 dark:border-night-700 dark:bg-night-800/60">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Order</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {rows.length}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 dark:border-night-700 dark:bg-night-800/60">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Lokasi Desa</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {desaRes.length}
            </p>
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div className="mt-6">
        <MonitorCharts monthly={monthly} desa={desaChart} proses={proses} />
      </div>

      {/* Aktivitas terbaru */}
      <h2 className="mt-10 text-xl font-bold pa-hgrad">
        Aktivitas Order Terbaru
      </h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="pa-thead ">
            <tr>
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Donatur</th>
              <th className="px-4 py-3 font-semibold">Pohon</th>
              <th className="px-4 py-3 font-semibold">Desa</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 pa-card dark:divide-night-800">
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {r.idpohon}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{r.nama}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.localName}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{namaDesa(r.desa)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {r.tglAdopt ? tanggal(r.tglAdopt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    {...(ADOPTION_STATUS[adoptionStatus(r.confirmation, !!r.fotoBuktiUrl)] ?? {
                      label: r.confirmation,
                      className: "bg-zinc-100 text-zinc-600 dark:bg-night-700 dark:text-zinc-300",
                    })}
                  />
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada aktivitas order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        Perlu tindak lanjut? Buka{" "}
        <Link
          href="/admin/verifikasi"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          Verifikasi Pembayaran
        </Link>{" "}
        atau{" "}
        <Link
          href="/admin/tagging"
          className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          Order Tagging
        </Link>
        .
      </p>
    </main>
  );
}
