"use client";

// Grafik keuangan halaman Data Adopsi (paritas "Admin | Data Financial"
// web lama): donat distribusi dana per lokasi (filter tahun) + bar total
// donasi per tahun (ikut filter lokasi tabel). Hanya baris IDR — baris
// USD (4 data lama) dihitung terpisah di baris Total tabel.

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
import type { ApiAdopsi } from "@/lib/api";

const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };
const GRID_STROKE = "#94a3b8";
const TOOLTIP_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#f8fafc",
  border: "none",
  borderRadius: 12,
  fontSize: 12,
} as const;

const SLICE_COLORS = [
  "#059669",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#c9a227",
  "#f59e0b",
  "#3b82f6",
  "#94a3b8",
];

function juta(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)} M`;
  if (v >= 1_000_000) return `${Math.round(v / 1e6)} jt`;
  return String(v);
}

const fmtRp = (v: number) => `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;

type SlicePoint = { name: string; total: number };
type BarPoint = { tahun: string; total: number };

export default function AdopsiCharts({
  rows,
  lokasi,
}: {
  rows: ApiAdopsi[];
  lokasi: string; // filter lokasi tabel ("semua" = semua lokasi)
}) {
  const [tahun, setTahun] = useState("semua");

  // Baris bersih: IDR + ber-tanggal (tanpa tanggal tak bisa duduk di sumbu tahun).
  const idr = useMemo(
    () => rows.filter((r) => r.cur !== "USD" && r.tglAdopt && r.price !== null),
    [rows],
  );

  const tahunList = useMemo(() => {
    const s = new Set<string>();
    for (const r of idr) s.add(r.tglAdopt!.slice(0, 4));
    return [...s].sort();
  }, [idr]);

  const donatData: SlicePoint[] = useMemo(() => {
    const perDesa = new Map<string, number>();
    for (const r of idr) {
      if (tahun !== "semua" && r.tglAdopt!.slice(0, 4) !== tahun) continue;
      perDesa.set(r.desa, (perDesa.get(r.desa) ?? 0) + (r.price ?? 0));
    }
    const arr = [...perDesa.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    if (arr.length > 8) {
      const lainnya = arr.slice(7).reduce((s, x) => s + x.total, 0);
      return [...arr.slice(0, 7), { name: "Lainnya", total: lainnya }];
    }
    return arr;
  }, [idr, tahun]);

  const barData: BarPoint[] = useMemo(() => {
    const perTahun = new Map<string, number>();
    for (const r of idr) {
      if (lokasi !== "semua" && r.desa !== lokasi) continue;
      const y = r.tglAdopt!.slice(0, 4);
      perTahun.set(y, (perTahun.get(y) ?? 0) + (r.price ?? 0));
    }
    return [...perTahun.entries()]
      .map(([t, total]) => ({ tahun: t, total }))
      .sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [idr, lokasi]);

  const donatTotal = donatData.reduce((s, x) => s + x.total, 0);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div
        className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700"
        data-testid="chart-donat"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold pa-hgrad">
            Distribusi Dana per Lokasi
          </h3>
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            aria-label="Filter tahun donat"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            <option value="semua">Semua tahun</option>
            {tahunList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
                    `${fmtRp(Number(value ?? 0))}${
                      donatTotal > 0
                        ? ` (${((Number(value ?? 0) / donatTotal) * 100).toFixed(1)}%)`
                        : ""
                    }`,
                    String(name),
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
            Tidak ada data donasi pada tahun ini.
          </p>
        )}
      </div>

      <div
        className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700"
        data-testid="chart-bar"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold pa-hgrad">
            Total Donasi per Tahun
          </h3>
          <span
            className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300"
            data-testid="bar-lokasi"
          >
            Lokasi: {lokasi === "semua" ? "Semua" : lokasi}
          </span>
        </div>
        {barData.length > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="tahun" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => juta(v)}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                  formatter={(value) => [fmtRp(Number(value ?? 0)), "Donasi"]}
                />
                <Bar dataKey="total" name="Donasi" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tidak ada data donasi pada lokasi ini.
          </p>
        )}
      </div>
    </div>
  );
}
