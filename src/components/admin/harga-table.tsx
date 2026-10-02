"use client";

// Tabel laporan "Data Harga Pohon" (paritas "Admin | Data Trees Price"
// web lama): hitungan pohon per lokasi × tier harga. Filter status
// (semua/tersedia/terpesan/diadopsi) menggerakkan tabel + donat; bar
// status memilih lokasinya sendiri. Kolom tier diturunkan dari data.

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ApiLokasi, ApiPriceRow } from "@/lib/api";
import HargaCharts from "@/components/admin/harga-charts";

const PER_PAGE = 10;
const rupiah = new Intl.NumberFormat("id-ID");

const tierLabel = (harga: number) => `${Math.round(harga / 1000)}rb`;

export default function HargaTable({
  rows,
  lokasi,
}: {
  rows: ApiPriceRow[];
  lokasi: ApiLokasi[];
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("semua");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const byNama = useMemo(
    () => new Map(lokasi.map((l) => [l.nama.toLowerCase(), l])),
    [lokasi],
  );

  const tiers = useMemo(
    () => [...new Set(rows.map((r) => r.harga))].sort((a, b) => a - b),
    [rows],
  );

  // desa × tier → jumlah (sudah tersaring status)
  const matrix = useMemo(() => {
    const m = new Map<string, Map<number, number>>();
    for (const r of rows) {
      if (status !== "semua" && r.status !== status) continue;
      const t = m.get(r.desa) ?? new Map<number, number>();
      t.set(r.harga, (t.get(r.harga) ?? 0) + r.jml);
      m.set(r.desa, t);
    }
    return m;
  }, [rows, status]);

  const desaRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...matrix.entries()]
      .map(([nama, t]) => {
        const info = byNama.get(nama.toLowerCase());
        return {
          nama,
          label: info ? [info.kabupaten, info.provinsi].filter(Boolean).join(", ") : "",
          detail: info
            ? [info.kecamatan, info.kabupaten, info.provinsi].filter(Boolean).join(", ")
            : nama,
          perTier: t,
          jumlah: [...t.values()].reduce((s, n) => s + n, 0),
        };
      })
      .filter(
        (d) =>
          !needle ||
          d.nama.toLowerCase().includes(needle) ||
          d.detail.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [matrix, byNama, q]);

  const totalPerTier = useMemo(
    () =>
      tiers.map(
        (t) => desaRows.reduce((s, d) => s + (d.perTier.get(t) ?? 0), 0),
      ),
    [tiers, desaRows],
  );
  const totalPohon = totalPerTier.reduce((s, n) => s + n, 0);

  const totalPages = Math.max(1, Math.ceil(desaRows.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageRows = desaRows.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <>
      <HargaCharts rows={rows} status={status} />
      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari lokasi…"
              className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter status"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            <option value="semua">Semua status</option>
            <option value="available">Tersedia</option>
            <option value="reserved">Terpesan</option>
            <option value="adopted">Diadopsi</option>
          </select>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {desaRows.length.toLocaleString("id-ID")} lokasi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="px-3 py-3">No</th>
                <th className="px-3 py-3">Lokasi</th>
                {tiers.map((t) => (
                  <th key={t} className="px-3 py-3 text-right">
                    {tierLabel(t)}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {pageRows.map((d, i) => (
                <tr key={d.nama} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-3 py-3 text-xs text-zinc-400">
                    {(current - 1) * PER_PAGE + i + 1}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{d.nama}</p>
                    {d.label && <p className="text-xs text-zinc-500 dark:text-zinc-400">{d.label}</p>}
                  </td>
                  {tiers.map((t) => (
                    <td key={t} className="px-3 py-3 text-right text-zinc-600 tabular-nums dark:text-zinc-300">
                      {d.perTier.get(t) ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-semibold text-zinc-800 tabular-nums dark:text-zinc-100">
                    {d.jumlah}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + tiers.length}
                    className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Tidak ada lokasi yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot
              className="border-t-2 border-emerald-200 bg-emerald-50/70 dark:border-night-700 dark:bg-night-800/60"
              data-testid="total-harga"
            >
              <tr>
                <td
                  colSpan={2}
                  className="px-3 py-3 text-right text-xs font-semibold tracking-wide uppercase text-emerald-800 dark:text-emerald-300"
                >
                  Total ({desaRows.length.toLocaleString("id-ID")} lokasi)
                </td>
                {totalPerTier.map((n, i) => (
                  <td
                    key={tiers[i]}
                    className="px-3 py-3 text-right font-bold text-emerald-900 tabular-nums dark:text-emerald-200"
                  >
                    {n.toLocaleString("id-ID")}
                  </td>
                ))}
                <td className="px-3 py-3 text-right font-bold text-emerald-900 tabular-nums dark:text-emerald-200">
                  {rupiah.format(totalPohon)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-emerald-100 px-4 py-3 text-sm dark:border-night-700">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Hal {current} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
              >
                Berikutnya <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
