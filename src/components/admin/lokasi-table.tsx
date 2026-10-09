"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, MapPin, Pencil, Search } from "lucide-react";
import type { ApiLokasi, ApiPetaPohon } from "@/lib/api";
import { namaDesa } from "@/lib/format";
import { hapusLokasi, toggleLokasiAktif } from "@/lib/actions/lokasi";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import LokasiForm from "@/components/admin/lokasi-form";
import LokasiPetaLoader from "@/components/admin/lokasi-peta-loader";
import { STATUS_STYLE, TREE_PATH } from "@/components/admin/lokasi-peta-shared";

export default function LokasiTable({
  lokasi,
  pohon,
}: {
  lokasi: ApiLokasi[];
  pohon: ApiPetaPohon[];
}) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return lokasi;
    return lokasi.filter((l) =>
      [l.nama, l.label, l.kodeCert, l.kodePohon, l.kecamatan, l.kabupaten, l.provinsi, l.skema]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [lokasi, q]);

  const petaDipakai = pohon.length > 0;

  return (
    <>
      <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Lokasi
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <LokasiForm />
        </div>
      </details>

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / kode / wilayah / skema…"
              className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {filtered.length} lokasi · id otomatis · kode pohon sebaiknya unik
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="px-3 py-3">No</th>
                <th className="px-3 py-3">Kode Cert</th>
                <th className="px-3 py-3">Kode Pohon</th>
                <th className="px-3 py-3">Desa</th>
                <th className="px-3 py-3">ID</th>
                <th className="px-3 py-3">Kecamatan</th>
                <th className="px-3 py-3">Kabupaten</th>
                <th className="px-3 py-3">Provinsi</th>
                <th className="px-3 py-3">Skema</th>
                <th className="px-3 py-3">Aktif</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {filtered.map((l, i) => (
                <tr key={l.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-3 py-3 text-xs text-zinc-400">{i + 1}</td>
                  <td className="px-3 py-3 font-semibold text-zinc-800 dark:text-zinc-100">
                    {l.kodeCert || <span className="font-normal text-zinc-400">—</span>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-zinc-800 dark:text-zinc-100">
                    {l.kodePohon || <span className="font-normal text-zinc-400">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/lokasi/${l.slug}`}
                      className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      {namaDesa(l.nama)}
                    </Link>
                    {l.label && l.label !== l.nama && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{l.label}</p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {l.total} pohon ({l.available} tersedia)
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">{l.id}</td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {l.kecamatan || <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {l.kabupaten || <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {l.provinsi || <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                    {l.skema || <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <form action={toggleLokasiAktif}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="aktif" value={l.aktif ? 1 : 0} />
                      <button
                        type="submit"
                        title={l.aktif ? "Aktif — klik untuk sembunyikan dari web" : "Nonaktif — klik untuk tampilkan"}
                        aria-label={l.aktif ? `Nonaktifkan ${l.nama}` : `Aktifkan ${l.nama}`}
                        className={`rounded-xl p-2 transition-colors ${
                          l.aktif
                            ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-night-800"
                            : "text-zinc-300 hover:bg-zinc-50 dark:text-night-600 dark:hover:bg-night-800"
                        }`}
                      >
                        {l.aktif ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {petaDipakai && (
                      <button
                        type="button"
                        onClick={() => {
                          setFocus(l.nama);
                          document
                            .getElementById("peta-lokasi")
                            ?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        title="Fokuskan peta ke lokasi ini"
                        aria-label={`Fokuskan peta ke ${l.nama}`}
                        className="mr-1 inline-block rounded-xl border border-sky-200 p-2 text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-900/60 dark:text-sky-300 dark:hover:bg-sky-950/40"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    )}
                    <Link
                      href={`/admin/lokasi/${l.id}/edit`}
                      className="mr-1 inline-block rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <Pencil className="inline h-3.5 w-3.5" /> Edit
                    </Link>
                    <form action={hapusLokasi} className="inline">
                      <input type="hidden" name="id" value={l.id} />
                      <ConfirmSubmit
                        message={`Hapus lokasi ${l.nama}? Lokasi dengan pohon tidak dapat dihapus.`}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Tidak ada lokasi yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {petaDipakai && (
        <div id="peta-lokasi" className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Peta Sebaran Pohon {focus ? `— ${focus}` : "(semua lokasi)"}
          </h2>
          <LokasiPetaLoader lokasi={lokasi} pohon={pohon} focus={focus} />
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {Object.entries(STATUS_STYLE).map(([status, s]) => (
              <span key={status} className="inline-flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0 drop-shadow-sm">
                  <path
                    d={TREE_PATH}
                    fill={s.color}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  />
                </svg>
                {s.label}
              </span>
            ))}
          </p>
        </div>
      )}
    </>
  );
}
