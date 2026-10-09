"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import type { ApiTree, TreeStatus } from "@/lib/api";
import { namaDesa, rupiah, TREE_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteTree, setTreeUnggulan, removeTreeUnggulan } from "@/lib/actions/tree";

const PER_PAGE = 50;

const selectClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

export default function PohonTable({ trees }: { trees: ApiTree[] }) {
  const [q, setQ] = useState("");
  const [desa, setDesa] = useState("semua");
  const [status, setStatus] = useState("semua");
  const [unggulan, setUnggulan] = useState("semua");
  const [page, setPage] = useState(1);

  const desaList = useMemo(
    () => [...new Set(trees.map((t) => t.desa).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [trees],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return trees.filter((t) => {
      if (desa !== "semua" && t.desa !== desa) return false;
      if (status !== "semua" && t.status !== (status as TreeStatus)) return false;
      if (unggulan === "unggulan" && t.highlight !== 1) return false;
      if (unggulan === "biasa" && t.highlight === 1) return false;
      if (!needle) return true;
      return (
        t.code.toLowerCase().includes(needle) ||
        t.localName.toLowerCase().includes(needle) ||
        (t.species?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [trees, q, desa, status, unggulan]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageTrees = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const adaFilter = q !== "" || desa !== "semua" || status !== "semua" || unggulan !== "semua";

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Cari pohon"
            placeholder="Cari kode / nama lokal / spesies…"
            className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </div>
        <select
          value={desa}
          onChange={(e) => {
            setDesa(e.target.value);
            setPage(1);
          }}
          aria-label="Filter lokasi"
          className={selectClass}
        >
          <option value="semua">Semua lokasi</option>
          {desaList.map((d) => (
            <option key={d} value={d}>
              {namaDesa(d)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter status adopsi"
          className={selectClass}
        >
          <option value="semua">Semua status</option>
          <option value="AVAILABLE">Tersedia</option>
          <option value="RESERVED">Dipesan</option>
          <option value="ADOPTED">Teradopsi</option>
        </select>
        <select
          value={unggulan}
          onChange={(e) => {
            setUnggulan(e.target.value);
            setPage(1);
          }}
          aria-label="Filter unggulan"
          className={selectClass}
        >
          <option value="semua">Semua pohon</option>
          <option value="unggulan">Unggulan</option>
          <option value="biasa">Bukan unggulan</option>
        </select>
        {adaFilter && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setDesa("semua");
              setStatus("semua");
              setUnggulan("semua");
              setPage(1);
            }}
            aria-label="Reset filter"
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400" data-testid="jml-pohon">
          {filtered.length.toLocaleString("id-ID")} pohon
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Pohon</th>
              <th className="px-4 py-3 font-semibold">Lokasi</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-center font-semibold">Unggulan</th>
              <th className="px-4 py-3 text-right font-semibold">Harga</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {pageTrees.map((tree, i) => (
              <tr key={`${tree.code}-${i}`} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                  {tree.code}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-emerald-50 dark:bg-night-800">
                      <Image
                        src={tree.photoUrl}
                        alt={tree.localName}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">{tree.localName}</p>
                      <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{tree.species}</p>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{namaDesa(tree.desa)}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    {...(TREE_STATUS[tree.status] ?? {
                      label: tree.status,
                      className: "bg-zinc-100 text-zinc-600 dark:text-zinc-300",
                    })}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  {tree.highlight === 1 ? (
                    <form action={removeTreeUnggulan}>
                      <input type="hidden" name="id" value={tree.id} />
                      <button
                        type="submit"
                        title="Klik untuk melepas status unggulan"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200"
                      >
                        ★ Unggulan
                      </button>
                    </form>
                  ) : (
                    <form action={setTreeUnggulan}>
                      <input type="hidden" name="id" value={tree.id} />
                      <button
                        type="submit"
                        disabled={tree.status !== "AVAILABLE"}
                        title={
                          tree.status !== "AVAILABLE"
                            ? "Hanya pohon berstatus tersedia yang bisa diunggulkan"
                            : "Tampilkan pohon ini di beranda"
                        }
                        className="rounded-full border border-emerald-200 dark:border-night-700 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-night-800"
                      >
                        Jadikan
                      </button>
                    </form>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-800">
                  {rupiah(tree.priceIdr)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/pohon/${encodeURIComponent(tree.code)}`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/pohon/${encodeURIComponent(tree.code)}/galeri`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Galeri
                    </Link>
                    <form action={deleteTree}>
                      <input type="hidden" name="idpohon" value={tree.code} />
                      <ConfirmSubmit
                        message={`Hapus pohon ${tree.code}? Tindakan ini tidak bisa dibatalkan.`}
                        disabled={tree.status !== "AVAILABLE"}
                        title={
                          tree.status !== "AVAILABLE"
                            ? "Pohon sudah diadopsi/dipesan — tidak bisa dihapus"
                            : undefined
                        }
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {pageTrees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {trees.length === 0
                    ? "Tidak ada data pohon."
                    : "Tidak ada pohon yang cocok dengan pencarian/filter."}
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
