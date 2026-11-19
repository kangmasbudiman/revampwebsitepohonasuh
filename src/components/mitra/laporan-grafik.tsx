"use client";

// Grafik halaman Laporan Mitra: tren adopsi per bulan (bar, rentang dari
// tanggal adopsi terawal–terbaru — deterministik untuk SSR/CSR), distribusi
// per program (donut), dan status verifikasi (donut).

import { useMemo } from "react";
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
import type { ApiProgramMitra } from "@/lib/api";

const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };
const GRID_STROKE = "#e2e8f0";
const TOOLTIP_STYLE = {
  background: "rgba(15, 23, 42, 0.92)",
  color: "#f8fafc",
  border: "none",
  borderRadius: 12,
  fontSize: 12,
} as const;

const PROGRAM_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#c9a227", "#f59e0b", "#3b82f6", "#94a3b8"];
const STATUS_COLORS = ["#059669", "#f59e0b"];

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type Row = Record<string, unknown>;

export default function LaporanGrafik({
  adopsi,
  programs,
}: {
  adopsi: Row[];
  programs: ApiProgramMitra[];
}) {
  const { perBulan, perProgram, status } = useMemo(() => {
    const bulanMap = new Map<string, number>();
    const programMap = new Map<string, number>();
    let terverifikasi = 0;
    let pending = 0;
    const programById = new Map(programs.map((p) => [p.id, p.nama]));

    let minKey: string | null = null;
    let maxKey: string | null = null;
    for (const a of adopsi) {
      const tgl = String(a.tgl_adopt ?? "").slice(0, 7); // YYYY-MM
      if (/^\d{4}-\d{2}$/.test(tgl)) {
        bulanMap.set(tgl, (bulanMap.get(tgl) ?? 0) + 1);
        if (!minKey || tgl < minKey) minKey = tgl;
        if (!maxKey || tgl > maxKey) maxKey = tgl;
      }
      const progId = Number(a.program_id ?? 0);
      const progNama = progId ? (programById.get(progId) ?? `Program #${progId}`) : "Tanpa Program";
      programMap.set(progNama, (programMap.get(progNama) ?? 0) + 1);
      if (String(a.certnum ?? "").trim() !== "") terverifikasi += 1;
      else pending += 1;
    }

    // Rentang bulan: dari bulan terawal ke bulan terbaru data.
    const perBulan: { bulan: string; jumlah: number }[] = [];
    if (minKey && maxKey) {
      let [y, m] = minKey.split("-").map(Number);
      const [ey, em] = maxKey.split("-").map(Number);
      let guard = 0;
      while (guard++ < 60) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        perBulan.push({ bulan: `${BULAN[m - 1]} ${String(y).slice(2)}`, jumlah: bulanMap.get(key) ?? 0 });
        if (y === ey && m === em) break;
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
    }

    const perProgram = [...programMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      perBulan,
      perProgram,
      status: [
        { name: "Terverifikasi", value: terverifikasi },
        { name: "Pending Verifikasi", value: pending },
      ],
    };
  }, [adopsi, programs]);

  if (adopsi.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-10 text-center text-sm text-zinc-500 dark:border-night-700 dark:bg-night-800/40">
        Belum ada data adopsi — grafik akan tampil setelah mitra mencatat adopsi.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {/* Tren adopsi per bulan */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700 lg:col-span-2">
        <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Tren Adopsi per Bulan</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Jumlah pohon yang diadopsi per bulan (sejak adopsi pertama).</p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perBulan} margin={{ left: -8, right: 4 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bulan" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(16,185,129,0.12)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="jumlah" name="Pohon" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribusi per program */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Adopsi per Program</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Distribusi pohon teradopsi antar program.</p>
        <div className="mt-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={perProgram} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2}>
                {perProgram.map((p, i) => (
                  <Cell key={p.name} fill={PROGRAM_COLORS[i % PROGRAM_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status verifikasi */}
        <div className="mt-2 border-t border-emerald-50 pt-3 dark:border-night-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status Verifikasi</h3>
          <div className="mt-1 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={status} dataKey="value" nameKey="name" innerRadius={30} outerRadius={48} paddingAngle={2}>
                  {status.map((s, i) => (
                    <Cell key={s.name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
