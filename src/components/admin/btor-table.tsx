"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  Coins,
  FileSignature,
  MapPin,
  Search,
  Trees,
  UserRound,
} from "lucide-react";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { approveBtor, hapusBtor } from "@/lib/actions/btor";
import { type ApiBtor } from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";

const STATUS_CHIP: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  terkirim: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  revisi: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  disetujui: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
};

const PENCAIRAN_CHIP: Record<string, string> = {
  menunggu: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  diproses: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  dicairkan: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  terkirim: "Terkirim",
  revisi: "Revisi",
  disetujui: "Disetujui",
};

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

export default function BtorTable({ rows, level }: { rows: ApiBtor[]; level: number }) {
  const [q, setQ] = useState("");
  const [desa, setDesa] = useState("");
  const [petugas, setPetugas] = useState("");
  const [status, setStatus] = useState("");

  const desaOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.desa && !m.has(r.desa)) m.set(r.desa, namaDesa(r.desa));
    return [...m.entries()];
  }, [rows]);

  const petugasOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of rows) if (!m.has(r.idpetugas)) m.set(r.idpetugas, r.petugas || `#${r.idpetugas}`);
    return [...m.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (desa && r.desa !== desa) return false;
      if (petugas && String(r.idpetugas) !== petugas) return false;
      if (status && r.status !== status) return false;
      if (!needle) return true;
      return [r.judul, r.isi, r.hasil, r.desa, r.petugas, r.memo?.nomor ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, q, desa, petugas, status]);

  const adaFilter = q !== "" || desa !== "" || petugas !== "" || status !== "";
  const isAdmin = level === 1;

  const statusChip = (s: string) => (
    <span
      data-testid={`chip-status-${s}`}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_CHIP[s] ?? STATUS_CHIP.terkirim
      }`}
    >
      {STATUS_LABEL[s] ?? "Terkirim"}
    </span>
  );

  const memoCell = (r: ApiBtor) =>
    r.memo ? (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <FileSignature className="h-3.5 w-3.5" />
          {r.memo.nomor}
        </span>
        <span
          data-testid={`chip-pencairan-${r.memo.statusPencairan}`}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            PENCAIRAN_CHIP[r.memo.statusPencairan] ?? PENCAIRAN_CHIP.menunggu
          }`}
        >
          {r.memo.statusPencairan}
        </span>
      </span>
    ) : (
      <span className="text-xs text-zinc-400">—</span>
    );

  const tanggalRange = (r: ApiBtor) =>
    r.tanggalSelesai && r.tanggalSelesai !== r.tanggal
      ? `${r.tanggal} – ${r.tanggalSelesai}`
      : r.tanggal;

  const hapusForm = (r: ApiBtor) => (
    <form action={hapusBtor}>
      <input type="hidden" name="id" value={r.id} />
      <ConfirmSubmit
        message={`Hapus BTOR "${r.judul}"? Order di dalamnya kembali jadi kandidat BTOR lain. Tindakan ini tidak bisa dibatalkan.`}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Hapus
      </ConfirmSubmit>
    </form>
  );

  const setujuForm = (r: ApiBtor) => (
    <form action={approveBtor}>
      <input type="hidden" name="id" value={r.id} />
      <ConfirmSubmit
        message={`Setujui BTOR "${r.judul}"? Setelah disetujui, memo pencairan bisa diterbitkan.`}
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
      >
        Setujui
      </ConfirmSubmit>
    </form>
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            aria-label="Cari BTOR"
            placeholder="Cari judul / desa / no. memo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          aria-label="Filter desa"
          value={desa}
          onChange={(e) => setDesa(e.target.value)}
          className={`${inputClass} sm:w-44`}
        >
          <option value="">Semua desa</option>
          {desaOptions.map(([nama, label]) => (
            <option key={nama} value={nama}>
              {label}
            </option>
          ))}
        </select>
        {isAdmin && (
          <select
            aria-label="Filter petugas"
            value={petugas}
            onChange={(e) => setPetugas(e.target.value)}
            className={`${inputClass} sm:w-44`}
          >
            <option value="">Semua petugas</option>
            {petugasOptions.map(([id, nama]) => (
              <option key={id} value={String(id)}>
                {nama}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} sm:w-40`}
        >
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="terkirim">Terkirim</option>
          <option value="revisi">Revisi</option>
          <option value="disetujui">Disetujui</option>
        </select>
        {adaFilter && (
          <button
            type="button"
            aria-label="Reset filter"
            onClick={() => {
              setQ("");
              setDesa("");
              setPetugas("");
              setStatus("");
            }}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
          >
            Reset
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="jml-btor">
        {filtered.length} BTOR{filtered.length !== rows.length && ` (dari ${rows.length})`}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-emerald-100 pa-card px-4 py-10 text-center text-sm text-zinc-500 dark:border-night-700 dark:text-zinc-400">
          {rows.length === 0
            ? "Belum ada Laporan BTOR — buat dari order tagging yang sudah selesai lewat tombol BTOR Baru."
            : "Tidak ada BTOR yang cocok dengan filter."}
        </p>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700 md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Desa</th>
                  {isAdmin && <th className="px-4 py-3">Petugas</th>}
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Dana</th>
                  <th className="px-4 py-3">Memo</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {tanggalRange(r)}
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <Link
                        href={`/admin/btor/${r.id}`}
                        className="line-clamp-1 font-medium text-emerald-900 hover:underline dark:text-emerald-100"
                      >
                        {r.judul}
                      </Link>
                      {r.status === "revisi" && r.catatanRevisi && (
                        <p className="line-clamp-1 text-xs text-orange-600 dark:text-orange-400">
                          Revisi: {r.catatanRevisi}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusChip(r.status)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.desa ? namaDesa(r.desa) : "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {r.petugas || "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.jmlOrder}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.dana !== null && r.dana > 0 ? rupiah(r.dana) : "—"}
                    </td>
                    <td className="px-4 py-3">{memoCell(r)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/btor/${r.id}`}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:hover:bg-night-800"
                        >
                          Detail
                        </Link>
                        {isAdmin && r.status === "terkirim" && setujuForm(r)}
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
                    {statusChip(r.status)}
                  </span>
                </div>
                <Link
                  href={`/admin/btor/${r.id}`}
                  className="mt-2 block font-semibold text-emerald-900 hover:underline dark:text-emerald-100"
                >
                  {r.judul}
                </Link>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {r.desa && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {namaDesa(r.desa)}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {r.petugas || "—"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Trees className="h-3.5 w-3.5" />
                    {r.jmlOrder} order
                  </span>
                  {r.dana !== null && r.dana > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {rupiah(r.dana)}
                    </span>
                  )}
                </div>
                <div className="mt-2">{memoCell(r)}</div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/btor/${r.id}`}
                    className="flex-1 rounded-lg border border-emerald-200 px-3 py-2 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:hover:bg-night-800"
                  >
                    <ClipboardCheck className="mr-1 inline h-3.5 w-3.5" />
                    Detail
                  </Link>
                  {isAdmin && r.status === "terkirim" && (
                    <div className="flex-1 text-center">{setujuForm(r)}</div>
                  )}
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
