"use client";

// Filter desa untuk /admin/tagging (khusus admin level 1 — daftar ordernya
// mencakup semua desa; petugas tetap hanya melihat desa tugasnya).
import { useRouter } from "next/navigation";

export default function DesaFilter({
  options,
  value,
  proses,
}: {
  options: string[];
  value: string;
  proses: string;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
      Desa
      <select
        aria-label="Filter desa"
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams();
          if (proses) p.set("proses", proses);
          if (e.target.value) p.set("desa", e.target.value);
          const q = p.toString();
          router.push(`/admin/tagging${q ? `?${q}` : ""}`);
        }}
        className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium capitalize text-zinc-700 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
      >
        <option value="">Semua desa</option>
        {options.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
