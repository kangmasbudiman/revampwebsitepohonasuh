"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { rupiah } from "@/lib/format";
import { verifikasiDp } from "@/lib/actions/dp";

type Row = {
  id: number;
  mitra_nama?: string | null;
  program_nama?: string | null;
  pesanan_id: number;
  jumlah: number | string;
  bukti: string | null;
  status: string;
  metode?: string;
  invoice?: string | null;
  created_at: string | null;
};

const STATUS: Record<string, [string, string]> = {
  menunggu: ["Menunggu Verifikasi", "bg-amber-100 text-amber-700"],
  disetujui: ["Disetujui", "bg-emerald-100 text-emerald-700"],
  ditolak: ["Ditolak", "bg-red-100 text-red-700"],
};

// Tombol "Lihat bukti" → popup bergaya galeri; admin bisa langsung
// menyetujui/menolak DP dari dalam popup.
export default function DpBuktiModal({ row, assetOrigin }: { row: Row; assetOrigin: string }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const photos = row.bukti
    ? String(row.bukti)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (/^https?:\/\//i.test(s) ? s : `${assetOrigin}/assets/${s.replace(/^\/?(assets\/)?/, "")}`))
    : [];
  const lbl = STATUS[row.status] ?? [row.status, "bg-zinc-100 text-zinc-600"];

  return (
    <>
      <button
        type="button"
        onClick={() => { setIdx(0); setOpen(true); }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden /> Lihat bukti
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Bukti DP ${row.id}`}>
          <button type="button" className="absolute inset-0 cursor-default bg-black/70" onClick={() => setOpen(false)} aria-label="Tutup popup" />
          <div className="relative max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-night-900">
            <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4 dark:border-night-700">
              <div>
                <h3 className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100">Bukti Pembayaran DP</h3>
                <p className="text-xs text-zinc-500">Pesanan #{row.pesanan_id} · {row.mitra_nama ?? "Mitra"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-night-800" aria-label="Tutup">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="grid max-h-[62vh] gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <div>
                {photos.length === 0 ? (
                  <div className="grid h-64 place-items-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-center text-sm text-zinc-500 dark:border-night-700 dark:bg-night-800">
                    {row.metode === "online" ? "Dibayar otomatis via Mayar — tanpa bukti transfer." : "Bukti transfer belum diunggah."}
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-zinc-50 dark:border-night-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photos[idx]} alt={`Bukti DP ${row.id}`} className="max-h-[56vh] w-full object-contain" />
                    {photos.length > 1 && (
                      <>
                        <button type="button" onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white" aria-label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setIdx((i) => (i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white" aria-label="Berikutnya"><ChevronRight className="h-4 w-4" /></button>
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white">{idx + 1} / {photos.length}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Detail DP</p>
                  <dl className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Mitra</dt><dd className="font-semibold text-zinc-800 dark:text-zinc-100">{row.mitra_nama ?? "—"}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Program</dt><dd className="font-semibold text-zinc-800 dark:text-zinc-100">{row.program_nama ?? "—"}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Nominal</dt><dd className="font-bold text-emerald-700">{rupiah(Number(row.jumlah))}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Invoice</dt><dd className="font-mono">{row.invoice ?? "—"}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Metode</dt><dd className="font-semibold">{row.metode === "online" ? "Online (Mayar)" : "Transfer bank"}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-zinc-500">Status</dt><dd><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lbl[1]}`}>{lbl[0]}</span></dd></div>
                  </dl>
                </div>
                <p className="text-[11px] text-zinc-400">Diajukan: {row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-emerald-100 px-5 py-4 dark:border-night-700">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 dark:border-night-700 dark:text-zinc-300">Tutup</button>
              {row.status === "menunggu" && (
                <>
                  <form action={verifikasiDp}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="ditolak" />
                    <button type="submit" onClick={() => setOpen(false)} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">Tolak</button>
                  </form>
                  <form action={verifikasiDp}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="disetujui" />
                    <button type="submit" onClick={() => setOpen(false)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Setujui DP</button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
