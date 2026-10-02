"use client";

import {
  Area,
  AreaChart,
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

export type MonthlyPoint = { month: string; order: number; donasi: number };
export type DesaPoint = { name: string; tersedia: number; teradopsi: number };
export type ProsesSlice = { name: string; value: number };

const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };
const GRID_STROKE = "#94a3b8";
const TOOLTIP_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#f8fafc",
  border: "none",
  borderRadius: 12,
  fontSize: 12,
} as const;

const PROSES_COLORS: Record<string, string> = {
  Baru: "#f59e0b",
  Diproses: "#3b82f6",
  Selesai: "#10b981",
};

function juta(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)} M`;
  if (v >= 1_000_000) return `${Math.round(v / 1e6)} jt`;
  return String(v);
}

export default function MonitorCharts({
  monthly,
  desa,
  proses,
}: {
  monthly: MonthlyPoint[];
  desa: DesaPoint[];
  proses: ProsesSlice[];
}) {
  const totalProses = proses.reduce((s, p) => s + p.value, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Tren order & donasi 12 bulan */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm lg:col-span-2 dark:border-night-700">
        <h3 className="text-sm font-semibold pa-hgrad">
          Tren Order &amp; Donasi (12 Bulan)
        </h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrder" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gDonasi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a227" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#c9a227" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="order"
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <YAxis
                yAxisId="donasi"
                orientation="right"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v: number) => juta(v)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) =>
                  name === "donasi"
                    ? [`Rp ${Number(value ?? 0).toLocaleString("id-ID")}`, "Donasi"]
                    : [String(value ?? 0), "Order"]
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                yAxisId="order"
                type="monotone"
                dataKey="order"
                name="order"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gOrder)"
              />
              <Area
                yAxisId="donasi"
                type="monotone"
                dataKey="donasi"
                name="donasi"
                stroke="#c9a227"
                strokeWidth={2}
                fill="url(#gDonasi)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribusi status proses order */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <h3 className="text-sm font-semibold pa-hgrad">
          Status Proses Order
        </h3>
        {totalProses > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proses}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {proses.map((p) => (
                    <Cell key={p.name} fill={PROSES_COLORS[p.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Belum ada data order.
          </p>
        )}
      </div>

      {/* Adopsi per desa */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm lg:col-span-3 dark:border-night-700">
        <h3 className="text-sm font-semibold pa-hgrad">
          Pohon per Lokasi Desa (8 Teratas)
        </h3>
        {desa.length > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={desa} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "#94a3b8", fillOpacity: 0.08 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tersedia" name="Tersedia" stackId="d" fill="#34d399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="teradopsi" name="Teradopsi" stackId="d" fill="#047857" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Data desa tidak tersedia.
          </p>
        )}
      </div>
    </div>
  );
}
