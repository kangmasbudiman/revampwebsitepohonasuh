"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Camera, Coins, MapPin, NotebookPen, Search, UserRound } from "lucide-react";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteLaporan } from "@/lib/actions/laporan";
import { LAPORAN_JENIS, LAPORAN_JENIS_LABEL, type ApiLaporan } from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";

const JENIS_CHIP: Record<string, string> = {
  tagging: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pemantauan: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  papan: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  lainnya: "bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-300",
};

const STATUS_CHIP: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  terkirim: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

export default function LaporanTable({ rows, level }: { rows: ApiLaporan[]; level: number }) {
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [petugas, setPetugas] = useState("");
  const [status, setStatus] = useState("");

  const petugasOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of rows) if (!m.has(r.idpetugas)) m.set(r.idpetugas, r.petugas || `#${r.idpetugas}`);
    return [...m.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (jenis && r.jenis !== jenis) return false;
      if (petugas && String(r.idpetugas) !== petugas) return false;
      if (status && r.status !== status) return false;
      if (!needle) return true;
      return [r.judul, r.isi, r.hasil, r.desa, r.petugas, LAPORAN_JENIS_LABEL[r.jenis] ?? r.jenis]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, jenis, petugas, status]);

  const adaFilter = q !== "" || jenis !== "" || petugas !== "" || status !== "";
  const isAdmin = level === 1;

  const filterBar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-[220px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          aria-label="Cari laporan"
          placeholder="Cari judul / desa / uraian…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${inputClass} pl-9`}
        />
      </div>
      <select
        aria-label="Filter jenis kegiatan"
        value={jenis}
        onChange={(e) => setJenis(e.target.value)}
        className={`${inputClass} sm:w-48`}
      >
        <option value="">Semua jenis</option>
        {LAPORAN_JENIS.map((j) => (
          <option key={j.key} value={j.key}>
            {j.label}
          </option>
        ))}
      </select>
      {isAdmin && (
        <select
          aria-label="Filter petugas"
          value={petugas}
          onChange={(e) => setPetugas(e.target.value)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="">Semua petugas</option>
          {petugasOptions.map(([id, nama]) => (
            <option key={id} value={String(id)}>
              {nama}
            </option>
          ))}
        </select>
      )}
      {!isAdmin && (
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} sm:w-40`}
        >
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="terkirim">Terkirim</option>
        </select>
      )}
      {adaFilter && (
        <button
          type="button"
          aria-label="Reset filter"
          onClick={() => {
            setQ("");
            setJenis("");
            setPetugas("");
            setStatus("");
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
        >
          Reset
        </button>
      )}
    </div>
  );

  const jenisChip = (j: string) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        JENIS_CHIP[j] ?? JENIS_CHIP.lainnya
      }`}
    >
      {LAPORAN_JENIS_LABEL[j] ?? "Lainnya"}
    </span>
  );

  const statusChip = (s: string) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_CHIP[s] ?? STATUS_CHIP.terkirim
      }`}
    >
      {s === "draft" ? "Draft" : "Terkirim"}
    </span>
  );

  const tanggalRange = (r: ApiLaporan) =>
    r.tanggalSelesai && r.tanggalSelesai !== r.tanggal
      ? `${r.tanggal} – ${r.tanggalSelesai}`
      : r.tanggal;

  const hapusForm = (r: ApiLaporan) => (
    <form action={deleteLaporan}>
      <input type="hidden" name="id" value={r.id} />
      <ConfirmSubmit
        message={`Hapus laporan "${r.judul}" beserta semua fotonya? Tindakan ini tidak bisa dibatalkan.`}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Hapus
      </ConfirmSubmit>
    </form>
  );

  return (
    <div className="mt-6 space-y-4">
      {filterBar}
      <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="jml-laporan">
        {filtered.length} laporan{filtered.length !== rows.length && ` (dari ${rows.length})`}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-emerald-100 pa-card px-4 py-10 text-center text-sm text-zinc-500 dark:border-night-700 dark:text-zinc-400">
          {rows.length === 0
            ? "Belum ada laporan kegiatan — buat laporan pertama lewat formulir Tambah Laporan."
            : "Tidak ada laporan yang cocok dengan filter."}
        </p>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700 md:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Desa</th>
                  {isAdmin && <th className="px-4 py-3">Petugas</th>}
                  <th className="px-4 py-3">Dana</th>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {tanggalRange(r)}
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <Link
                        href={`/admin/laporan/${r.id}/edit`}
                        className="line-clamp-1 font-medium text-emerald-900 hover:underline dark:text-emerald-100"
                      >
                        {r.judul}
                      </Link>
                      <p className="line-clamp-1 text-xs text-zinc-400">{r.isi}</p>
                    </td>
                    <td className="px-4 py-3">{jenisChip(r.jenis)}</td>
                    <td className="px-4 py-3">{statusChip(r.status)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.desa ? namaDesa(r.desa) : "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {r.petugas || "—"}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.dana !== null && r.dana > 0 ? rupiah(r.dana) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                        {r.foto[0] && (
                          <Image
                            src={r.foto[0].url}
                            alt={`Foto ${r.judul}`}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        )}
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Camera className="h-3.5 w-3.5" />
                          {r.foto.length}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/laporan/${r.id}/edit`}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:hover:bg-night-800"
                        >
                          Edit
                        </Link>
                        {hapusForm(r)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: kartu */}
          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-emerald-100 pa-card p-4 shadow-sm dark:border-night-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {tanggalRange(r)}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {jenisChip(r.jenis)}
                    {statusChip(r.status)}
                  </span>
                </div>
                <Link
                  href={`/admin/laporan/${r.id}/edit`}
                  className="mt-2 block font-semibold text-emerald-900 hover:underline dark:text-emerald-100"
                >
                  {r.judul}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{r.isi}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {r.desa && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {namaDesa(r.desa)}
                    </span>
                  )}
                  {r.dana !== null && r.dana > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {rupiah(r.dana)}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {r.petugas || "—"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5" />
                    {r.foto.length} foto
                  </span>
                </div>
                {r.foto.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {r.foto.slice(0, 5).map((f) => (
                      <div key={f.id} className="relative h-16 w-16 shrink-0">
                        <Image
                          src={f.url}
                          alt={`Foto ${r.judul}`}
                          fill
                          sizes="64px"
                          className="rounded-lg object-cover"
                        />
                      </div>
                    ))}
                    {r.foto.length > 5 && (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-night-800 dark:text-zinc-300">
                        +{r.foto.length - 5}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/laporan/${r.id}/edit`}
                    className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:hover:bg-night-800"
                  >
                    <NotebookPen className="mr-1 inline h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <div className="flex-1 text-center">{hapusForm(r)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
