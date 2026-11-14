"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowDownUp, ArrowUp, Bookmark, ChevronLeft, ChevronRight, RotateCcw, Search, Snowflake, Sun, X } from "lucide-react";
import type { ApiTree } from "@/lib/api";
import { namaDesa, rupiah, tampilanStatusTree } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import RowsPerPage from "@/components/admin/rows-per-page";
import ReserveTreeButton from "@/components/admin/reserve-tree-button";
import FreezeButton from "@/components/admin/freeze-button";
import SubmitButton from "@/components/admin/submit-button";
import { deleteTree, setTreeUnggulan, removeTreeUnggulan, unfreezeTrees, cancelReserveTree } from "@/lib/actions/tree";

const selectClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

type UrutUkuran = "off" | "desc" | "asc";

// Tabel Kelola Pohon — paginasi & filter server-side (URL-driven): halaman
// server mengambil satu halaman pohon dari API, filter/sort/halaman berpindah
// lewat query URL sehingga data yang ditransfer tetap ringan.
export default function PohonTable({
  trees,
  total,
  page,
  perPage,
  q,
  desa,
  status,
  unggulan,
  urut,
  desas,
  jmlUnggulan,
  jmlDipesan,
}: {
  trees: ApiTree[];
  total: number;
  page: number;
  perPage: number;
  q: string;
  desa: string;
  status: string;
  unggulan: string;
  urut: UrutUkuran;
  desas: string[];
  jmlUnggulan: number;
  jmlDipesan: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  // Ketikan pencarian lokal + debounce sebelum mengubah URL.
  const [qKetik, setQKetik] = useState(q);
  // Pilihan massal (kode pohon) untuk "Pesan Terpilih" — dipilih lewat
  // checkbox; lintas halaman tetap tersimpan sampai dikosongkan/diremount.
  const [dipilih, setDipilih] = useState<string[]>([]);

  // Pohon yang boleh dipesan: tersedia, tidak beku, belum dipesan admin.
  const bisaDipesan = (t: ApiTree) => !t.reservedAdmin && t.status === "AVAILABLE" && !t.frozen;

  const ubah = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      router.push(`${pathname}?${p.toString()}`);
    },
    [sp, router, pathname],
  );
  // Ubah filter → kembali ke halaman 1.
  const setFilter = (k: string, v: string) => ubah({ [k]: v, page: null });

  useEffect(() => {
    const t = setTimeout(() => {
      if (qKetik !== q) ubah({ q: qKetik || null, page: null });
    }, 400);
    return () => clearTimeout(t);
  }, [qKetik, q, ubah]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const adaFilter = q !== "" || desa !== "" || status !== "" || unggulan !== "";

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
          <input
            value={qKetik}
            onChange={(e) => setQKetik(e.target.value)}
            aria-label="Cari pohon"
            placeholder="Cari kode / nama lokal / spesies…"
            className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </div>
        <select
          value={desa || "semua"}
          onChange={(e) => setFilter("desa", e.target.value === "semua" ? "" : e.target.value)}
          aria-label="Filter lokasi"
          className={selectClass}
        >
          <option value="semua">Semua lokasi</option>
          {desas.map((d) => (
            <option key={d} value={d}>
              {namaDesa(d)}
            </option>
          ))}
        </select>
        <select
          value={status || "semua"}
          onChange={(e) => setFilter("status", e.target.value === "semua" ? "" : e.target.value)}
          aria-label="Filter status adopsi"
          className={selectClass}
        >
          <option value="semua">Semua status</option>
          <option value="AVAILABLE">Tersedia</option>
          <option value="RESERVED">Dipesan</option>
          <option value="ADOPTED">Teradopsi</option>
          <option value="RESERVED_ADMIN">Dipesan Admin</option>
          <option value="FROZEN">Dibekukan</option>
        </select>
        <div className="flex gap-1.5" role="group" aria-label="Filter unggulan">
          {(
            [
              { v: "", l: "Semua pohon" },
              { v: "1", l: `★ Unggulan (${jmlUnggulan})` },
              { v: "0", l: "Bukan unggulan" },
              { v: "dipesan", l: `Dipesan (${jmlDipesan})` },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() =>
                f.v === "dipesan"
                  ? ubah({ unggulan: "dipesan", status: null, page: null })
                  : setFilter("unggulan", f.v)
              }
              className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                unggulan === f.v || (f.v === "" && unggulan === "")
                  ? "pa-btn-primary text-white"
                  : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
              }`}
            >
              {f.v === "dipesan" && <Bookmark aria-hidden className="mr-1 inline h-3 w-3" />}
              {f.l}
            </button>
          ))}
        </div>
        {adaFilter && (
          <button
            type="button"
            onClick={() => {
              setQKetik("");
              ubah({ q: null, desa: null, status: null, unggulan: null, page: null });
            }}
            aria-label="Reset filter"
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400" data-testid="jml-pohon">
          {total.toLocaleString("id-ID")} pohon
        </span>
      </div>

      {/* Bar pilihan massal — muncul saat ada pohon terpilih via checkbox */}
      {dipilih.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 bg-violet-50/70 px-4 py-2.5 dark:border-night-700 dark:bg-violet-950/20">
          <span className="text-xs font-semibold text-violet-800 dark:text-violet-300">
            {dipilih.length} pohon dipilih
          </span>
          <ReserveTreeButton
            codes={dipilih}
            label="Pesan Terpilih"
            title="Pesan semua pohon terpilih untuk satu nama pemesan"
            className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
          />
          <button
            type="button"
            onClick={() => setDipilih([])}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
          >
            Kosongkan
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Pilih semua pohon tersedia di halaman ini"
                  checked={
                    trees.some(bisaDipesan) && trees.filter(bisaDipesan).every((t) => dipilih.includes(t.code))
                  }
                  disabled={!trees.some(bisaDipesan)}
                  onChange={(e) => {
                    const tersedia = trees.filter(bisaDipesan).map((t) => t.code);
                    setDipilih((prev) =>
                      e.target.checked
                        ? [...new Set([...prev, ...tersedia])]
                        : prev.filter((c) => !tersedia.includes(c)),
                    );
                  }}
                  className="h-4 w-4 accent-violet-700"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Pohon</th>
              <th className="px-4 py-3 font-semibold">Lokasi</th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  data-testid="sort-ukuran"
                  onClick={() =>
                    ubah({
                      sort: urut === "off" ? "tinggi" : null,
                      dir: urut === "off" ? "desc" : urut === "desc" ? "asc" : null,
                    })
                  }
                  title="Urutkan ukuran: terbesar → terkecil → terkecil → terbesar"
                  className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Ukuran
                  {urut === "off" && <ArrowDownUp aria-hidden className="h-3 w-3 opacity-40" />}
                  {urut === "desc" && <ArrowDown aria-hidden className="h-3 w-3" />}
                  {urut === "asc" && <ArrowUp aria-hidden className="h-3 w-3" />}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-center font-semibold">Unggulan</th>
              <th className="px-4 py-3 text-right font-semibold">Harga</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {trees.map((tree, i) => (
              <tr key={`${tree.code}-${i}`} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                <td className="px-3 py-3">
                  {bisaDipesan(tree) && (
                    <input
                      type="checkbox"
                      aria-label={`Pilih pohon ${tree.code}`}
                      checked={dipilih.includes(tree.code)}
                      onChange={(e) =>
                        setDipilih((prev) =>
                          e.target.checked
                            ? [...prev, tree.code]
                            : prev.filter((c) => c !== tree.code),
                        )
                      }
                      className="h-4 w-4 accent-violet-700"
                    />
                  )}
                </td>
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
                <td
                  className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300"
                  title={tree.kelilingCm ? `Keliling batang ${tree.kelilingCm} cm` : undefined}
                >
                  <p className="font-medium">
                    T {tree.heightM ? `${tree.heightM} m` : "—"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ø {tree.diameterCm ? `${tree.diameterCm} cm` : "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge {...tampilanStatusTree(tree)} />
                  {tree.reservedAdmin && tree.reservedName && (
                    <p className="mt-1 max-w-[160px] truncate text-xs text-violet-700 dark:text-violet-300">
                      untuk {tree.reservedName}
                    </p>
                  )}
                  {tree.frozen && tree.frozenReason && (
                    <p className="mt-1 max-w-[180px] truncate text-xs text-sky-700 dark:text-sky-300" title={tree.frozenReason}>
                      ❄ {tree.frozenReason}
                    </p>
                  )}
                  {tree.frozen && tree.frozenUntil && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      s.d. {tree.frozenUntil}
                    </p>
                  )}
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
                        disabled={tree.status !== "AVAILABLE" || tree.frozen || tree.reservedAdmin}
                        title={
                          tree.status !== "AVAILABLE" || tree.frozen || tree.reservedAdmin
                            ? "Hanya pohon tersedia (tidak beku/dipesan admin) yang bisa diunggulkan"
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
                  <div className="flex flex-wrap justify-end gap-2">
                    {tree.reservedAdmin ? (
                      <form action={cancelReserveTree}>
                        <input type="hidden" name="idpohon" value={tree.code} />
                        <ConfirmSubmit
                          message={`Batalkan pesanan pohon ${tree.code}${tree.reservedName ? ` untuk ${tree.reservedName}` : ""}? Pohon akan kembali tersedia untuk umum.`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
                        >
                          <X aria-hidden className="h-3.5 w-3.5" /> Batalkan Pesanan
                        </ConfirmSubmit>
                      </form>
                    ) : bisaDipesan(tree) ? (
                      <ReserveTreeButton codes={[tree.code]} localName={tree.localName} />
                    ) : null}

                    {tree.status === "AVAILABLE" && (
                      tree.frozen ? (
                        <form action={unfreezeTrees}>
                          <input type="hidden" name="idpohon" value={tree.code} />
                          <input type="hidden" name="balik" value="/admin/pohon" />
                          <SubmitButton
                            icon={Sun}
                            pendingLabel="Memproses…"
                            title="Buka pembekuan — pohon kembali bisa diadopsi"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                          >
                            Aktifkan
                          </SubmitButton>
                        </form>
                      ) : (
                        <FreezeButton
                          codes={[tree.code]}
                          balik="/admin/pohon"
                          title="Bekukan pohon ini"
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-night-800"
                        >
                          <Snowflake aria-hidden className="h-3.5 w-3.5" /> Bekukan
                        </FreezeButton>
                      )
                    )}

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
            {trees.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {total === 0 && adaFilter
                    ? "Tidak ada pohon yang cocok dengan pencarian/filter."
                    : "Tidak ada data pohon."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 px-4 py-3 text-sm dark:border-night-700">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Hal {page} dari {totalPages}
          </span>
          <RowsPerPage
            value={perPage}
            onChange={(n) => ubah({ per: String(n), page: null })}
          />
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ubah({ page: String(page - 1) })}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => ubah({ page: String(page + 1) })}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
