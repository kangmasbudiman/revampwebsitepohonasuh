"use client";

// Grafik halaman Data Harga Pohon (paritas "Admin | Data Trees Price"
// web lama): donat komposisi pohon per tier harga — mengikuti filter
// status tabel — + bar hitungan per status untuk lokasi terpilih.

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiPriceRow } from "@/lib/api";
import { namaDesa } from "@/lib/format";

const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };
const GRID_STROKE = "#94a3b8";
const TOOLTIP_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#f8fafc",
  border: "none",
  borderRadius: 12,
  fontSize: 12,
} as const;

const SLICE_COLORS = ["#059669", "#c9a227", "#f59e0b", "#3b82f6"];

const tierLabel = (harga: number) => `${Math.round(harga / 1000)}rb`;

export default function HargaCharts({
  rows,
  status,
}: {
  rows: ApiPriceRow[];
  status: string; // filter status tabel ("semua" = semua status)
}) {
  const desaList = useMemo(
    () => [...new Set(rows.map((r) => r.desa))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const [lokasiBar, setLokasiBar] = useState(desaList[0] ?? "");

  const statusLabel = useMemo(
    () =>
      status === "semua"
        ? "Semua"
        : status === "available"
          ? "Tersedia"
          : status === "reserved"
            ? "Terpesan"
            : "Diadopsi",
    [status],
  );

  const donatData = useMemo(() => {
    const perTier = new Map<number, number>();
    for (const r of rows) {
      if (status !== "semua" && r.status !== status) continue;
      perTier.set(r.harga, (perTier.get(r.harga) ?? 0) + r.jml);
    }
    return [...perTier.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([harga, total]) => ({ name: tierLabel(harga), total }));
  }, [rows, status]);

  const barData = useMemo(() => {
    const perStatus = new Map<string, number>();
    for (const r of rows) {
      if (r.desa !== lokasiBar) continue;
      perStatus.set(r.status, (perStatus.get(r.status) ?? 0) + r.jml);
    }
    return [
      { status: "Diadopsi", total: perStatus.get("adopted") ?? 0 },
      { status: "Tersedia", total: perStatus.get("available") ?? 0 },
      { status: "Terpesan", total: perStatus.get("reserved") ?? 0 },
    ];
  }, [rows, lokasiBar]);

  const donatTotal = donatData.reduce((s, x) => s + x.total, 0);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div
        className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700"
        data-testid="chart-donat"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold pa-hgrad">
            Komposisi Pohon per Harga
          </h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
            Status: {statusLabel}
          </span>
        </div>
        {donatData.length > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donatData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {donatData.map((entry, i) => (
                    <Cell key={entry.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toLocaleString("id-ID")} pohon${
                      donatTotal > 0
                        ? ` (${((Number(value ?? 0) / donatTotal) * 100).toFixed(1)}%)`
                        : ""
                    }`,
                    `Harga ${String(name)}`,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span className="text-zinc-600 dark:text-zinc-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tidak ada pohon pada status ini.
          </p>
        )}
      </div>

      <div
        className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700"
        data-testid="chart-bar"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold pa-hgrad">
            Status Pohon per Lokasi
          </h3>
          <select
            value={lokasiBar}
            onChange={(e) => setLokasiBar(e.target.value)}
            aria-label="Filter lokasi bar"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            {desaList.map((d) => (
              <option key={d} value={d}>
                {namaDesa(d)}
              </option>
            ))}
          </select>
        </div>
        {barData.some((x) => x.total > 0) ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="status" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                  formatter={(value) => [`${Number(value ?? 0).toLocaleString("id-ID")} pohon`, "Jumlah"]}
                />
                <Bar dataKey="total" name="Pohon" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tidak ada pohon pada lokasi ini.
          </p>
        )}
      </div>
    </div>
  );
}
