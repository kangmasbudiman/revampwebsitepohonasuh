"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const LABELS: Record<string, string> = {
  pencarian_google: "Pencarian Google",
  asisten_ai: "Asisten AI",
  rekomendasi_teman: "Rekomendasi Teman",
  berita_artikel: "Berita / Artikel",
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x_twitter: "X (Twitter)",
  dari_mulut_ke_mulut: "Dari mulut ke mulut",
  lainnya: "Lainnya",
};

// Urutan warna: jawaban terbanyak diberi hijau paling tua
const BAR_COLORS = ["#16a34a", "#22c55e", "#34d399", "#6ee7b7", "#a7f3d0"];

export default function SumberInfoChart({ summary }: { summary: Record<string, number> }) {
  const data = Object.entries(summary)
    .map(([key, value]) => ({ key, name: LABELS[key] ?? key, value: Number(value) || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const maxValue = Math.max(...data.map((d) => d.value));
  const height = Math.max(220, data.length * 44 + 60);

  return (
    <section className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold pa-hgrad">Distribusi Sumber Info</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Dari mana pengguna tahu tentang Pohon Asuh — diurutkan dari jawaban terbanyak.
          </p>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Total <span className="font-bold text-emerald-800 dark:text-emerald-300">{total.toLocaleString("id-ID")}</span> jawaban
        </p>
      </div>

      <div className="mt-4 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }} barCategoryGap="28%">
            <CartesianGrid horizontal={false} strokeDasharray="4 4" className="stroke-zinc-200 dark:stroke-night-700" />
            <XAxis
              type="number"
              allowDecimals={false}
              domain={[0, maxValue + 1]}
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={176}
              tick={{ fontSize: 12, fill: "#52525b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(34,197,94,0.08)" }}
              contentStyle={{ borderRadius: 14, border: "1px solid #d1fae5", background: "#ffffff", fontSize: 12, padding: "8px 12px" }}
              formatter={(value) => [`${Number(value).toLocaleString("id-ID")} suara`, "Jumlah"]}
            />
            <Bar dataKey="value" name="Jawaban" radius={[0, 8, 8, 0]} maxBarSize={26}>
              {data.map((entry, index) => (
                <Cell key={entry.key} fill={BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
