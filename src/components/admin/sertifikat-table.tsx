"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { certUrl, type ApiSertifikatRow } from "@/lib/api";

const PER_PAGE = 50;

type Filter = "semua" | "aktif" | "kedaluwarsa";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aktif", label: "Aktif" },
  { value: "kedaluwarsa", label: "Kedaluwarsa" },
];

function statusExp(tglExp: string | null): "aktif" | "kedaluwarsa" | null {
  if (!tglExp) return null;
  return new Date(tglExp).getTime() < Date.now() ? "kedaluwarsa" : "aktif";
}

export default function SertifikatTable({
  rows,
  initialQuery = "",
}: {
  rows: ApiSertifikatRow[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("semua");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        needle &&
        !r.certnum.toLowerCase().includes(needle) &&
        !r.nama.toLowerCase().includes(needle) &&
        !r.invoice.toLowerCase().includes(needle) &&
        !r.idpohon.toLowerCase().includes(needle)
      ) {
        return false;
      }
      const st = statusExp(r.tglExp);
      if (filter === "aktif") return st === "aktif";
      if (filter === "kedaluwarsa") return st === "kedaluwarsa";
      return true;
    });
  }, [rows, q, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nomor sertifikat / donatur / invoice…"
            className="w-72 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "pa-btn-primary text-white"
                  : "border border-emerald-200 dark:border-night-700 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length.toLocaleString("id-ID")} sertifikat
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">No. Sertifikat</th>
              <th className="px-4 py-3">Donatur</th>
              <th className="px-4 py-3">Pohon</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Adopsi</th>
              <th className="px-4 py-3">Berlaku s.d.</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {pageRows.map((r) => {
              const st = statusExp(r.tglExp);
              return (
                <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {r.certnum}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{r.nama}</td>
                  <td className="px-4 py-3">
                    <span className="text-zinc-800 dark:text-zinc-200">{r.localName}</span>{" "}
                    <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{r.idpohon}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">{r.invoice}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.tglAdopt ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.tglExp ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="mr-3">
                      {st === "aktif" && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Aktif
                        </span>
                      )}
                      {st === "kedaluwarsa" && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-night-700 dark:text-zinc-300">
                          Kedaluwarsa
                        </span>
                      )}
                      {st === null && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                      )}
                    </span>
                    <Link
                      href={`/admin/order/${encodeURIComponent(r.invoice)}`}
                      className="mr-2 inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                    >
                      Koreksi
                    </Link>
                    <Link
                      href={certUrl(r.certnum)}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Lihat / Cetak
                    </Link>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Tidak ada sertifikat yang cocok.
                </td>
              </tr>
            )}
          </tbody>
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
  );
}
