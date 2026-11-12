"use client";

import { useState } from "react";
import { Check, ThumbsDown } from "lucide-react";
import type { ApiPengajuanBeku } from "@/lib/api";
import { prosesPengajuan } from "@/lib/actions/pembekuan";

const STATUS: Record<ApiPengajuanBeku["status"], { label: string; cls: string }> = {
  menunggu: {
    label: "Menunggu persetujuan",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  disetujui: {
    label: "Disetujui",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  ditolak: {
    label: "Ditolak",
    cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

const fmtTarget = (p: ApiPengajuanBeku) =>
  p.tipe === "desa"
    ? "Seluruh pohon tersedia di desa"
    : p.idpohon ?? "-";

const fmtDurasi = (p: ApiPengajuanBeku) =>
  p.hari > 0 ? `Sementara — ${p.hari} hari` : "Sampai dibuka manual";

// Daftar pengajuan pembekuan. Admin utama (peran "admin"): Setujui /
// Tolak dengan catatan. Pengelola (peran "pengelola"): status saja.
export default function PengajuanTable({
  rows,
  peran,
}: {
  rows: ApiPengajuanBeku[];
  peran: "admin" | "pengelola";
}) {
  const menunggu = rows.filter((p) => p.status === "menunggu");
  const riwayat = rows.filter((p) => p.status !== "menunggu");
  const [tolak, setTolak] = useState<ApiPengajuanBeku | null>(null);

  const renderBaris = (p: ApiPengajuanBeku) => (
    <tr key={p.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
      <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-900 dark:text-emerald-100">
        {p.desa}
      </td>
      <td className="max-w-[220px] px-4 py-3 text-zinc-700 dark:text-zinc-200">
        <p className="truncate">{fmtTarget(p)}</p>
        {p.tipe === "pohon" && p.idpohon && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {p.idpohon.split(",").length} pohon
          </p>
        )}
      </td>
      <td className="max-w-[240px] px-4 py-3 text-zinc-600 dark:text-zinc-300">
        <p className="line-clamp-2">{p.alasan}</p>
      </td>
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{fmtDurasi(p)}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[p.status].cls}`}
        >
          {STATUS[p.status].label}
        </span>
        {p.catatan && (
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">Catatan: {p.catatan}</p>
        )}
        {p.status !== "menunggu" && p.namaProses && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            oleh {p.namaProses}
            {p.processedAt ? ` · ${p.processedAt}` : ""}
          </p>
        )}
      </td>
      {peran === "admin" && (
        <td className="px-4 py-3 text-right">
          {p.status === "menunggu" ? (
            <div className="inline-flex gap-2">
              <form action={prosesPengajuan}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="aksi" value="setuju" />
                <button
                  type="submit"
                  title="Setujui — pembekuan langsung dijalankan"
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                >
                  <Check aria-hidden className="h-3.5 w-3.5" /> Setujui
                </button>
              </form>
              <button
                type="button"
                onClick={() => setTolak(p)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-night-800"
              >
                <ThumbsDown aria-hidden className="h-3.5 w-3.5" /> Tolak
              </button>
            </div>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">selesai</span>
          )}
        </td>
      )}
      {peran === "pengelola" && (
        <td className="px-4 py-3 text-right text-xs text-zinc-500 dark:text-zinc-400">
          {p.createdAt}
        </td>
      )}
    </tr>
  );

  return (
    <>
      {menunggu.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-emerald-950 dark:text-zinc-100">
            Pengajuan Pembekuan ({menunggu.length} menunggu persetujuan)
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-amber-200 pa-card shadow-sm dark:border-amber-900/60">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="pa-thead border-b border-amber-200 dark:border-amber-900/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Desa</th>
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">Alasan</th>
                    <th className="px-4 py-3 font-semibold">Durasi</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50 dark:divide-night-800">
                  {menunggu.map(renderBaris)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {riwayat.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-emerald-950 dark:text-zinc-100">
            {peran === "admin" ? "Riwayat Pengajuan" : "Riwayat Pengajuan Saya"}
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Desa</th>
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">Alasan</th>
                    <th className="px-4 py-3 font-semibold">Durasi</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {peran === "admin" ? "Aksi" : "Diajukan"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                  {riwayat.map(renderBaris)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <p className="mt-10 rounded-2xl border border-emerald-100 pa-card px-4 py-8 text-center text-sm text-zinc-500 dark:border-night-700 dark:text-zinc-400">
          Belum ada pengajuan pembekuan.
        </p>
      )}

      {/* Modal Tolak */}
      {tolak && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tolak-dialog-title"
          onClick={() => setTolak(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="tolak-dialog-title" className="text-lg font-bold text-emerald-950 dark:text-zinc-100">
              Tolak Pengajuan
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Pengajuan pembekuan desa <strong>{tolak.desa}</strong>
              {tolak.tipe === "desa" ? " (seluruh pohon)" : ` (${tolak.idpohon})`}.
            </p>
            <form
              action={prosesPengajuan}
              onSubmit={() => setTolak(null)}
              className="mt-4"
            >
              <input type="hidden" name="id" value={tolak.id} />
              <input type="hidden" name="aksi" value="tolak" />
              <label htmlFor="catatan-tolak" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Catatan untuk pengaju (opsional)
              </label>
              <textarea
                id="catatan-tolak"
                name="catatan"
                maxLength={255}
                rows={2}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTolak(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Tolak Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
