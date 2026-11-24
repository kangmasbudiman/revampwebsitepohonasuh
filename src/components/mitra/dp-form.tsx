"use client";

import { useState } from "react";
import { ajukanDp } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { Wallet, ReceiptText } from "lucide-react";
import { rupiah } from "@/lib/format";
import { apiAssetUrl } from "@/lib/api";

type Pesanan = {
  id: number;
  program_nama: string | null;
  jumlah: number;
  budget: number | null;
  dp_status: string | null;
};

type DpRow = {
  id: number;
  pesanan_id: number;
  jumlah: number | string;
  bukti: string | null;
  status: string;
  created_at: string;
  program_nama?: string | null;
};

const DP_STATUS: Record<string, [string, string]> = {
  menunggu: ["Menunggu Verifikasi", "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"],
  disetujui: ["Disetujui", "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"],
  ditolak: ["Ditolak", "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"],
};

export default function DpForm({
  pesanans,
  dps,
  title = "Uang Muka (DP)",
  showHistory = true,
}: {
  pesanans: Pesanan[];
  dps: DpRow[];
  title?: string;
  showHistory?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const pesanan = pesanans.find((p) => p.id === selected) ?? null;
  const saran = pesanan?.budget ? Math.round((pesanan.budget * 0.3) / 1000) * 1000 : 0;

  return (
    <div className="h-full rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-night-700 dark:bg-emerald-950/20">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <Wallet className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-100">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Ajukan DP untuk pesanan pohon. Nominal atau 30% dari budget program — bukti transfer akan diverifikasi admin.
          </p>
        </div>
      </div>

      <form action={ajukanDp} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pesanan *</span>
          <select
            name="pesanan_id"
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : null)}
            required
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            <option value="">Pilih pesanan...</option>
            {pesanans.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — {p.program_nama ?? "Program"} {p.dp_status === "menunggu" ? "(DP menunggu)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nominal DP (Rp) *</span>
          <input
            name="jumlah"
            type="number"
            min={1}
            defaultValue={saran || undefined}
            key={selected ?? "none"}
            required
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
          {saran > 0 && <span className="mt-1 block text-[11px] text-zinc-500">Saran 30% budget: {rupiah(saran)}</span>}
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bukti Transfer *</span>
          <input
            name="bukti"
            type="file"
            accept="image/*"
            required
            className="mt-1 w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
          />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton pendingLabel="Mengirim DP…" disabled={!selected} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
            Kirim Bukti DP
          </SubmitButton>
        </div>
      </form>

      {/* Riwayat DP */}
      {showHistory && (
      <div className="mt-5 overflow-hidden rounded-xl border border-emerald-100 bg-white dark:border-night-700 dark:bg-night-900">
        <p className="flex items-center gap-1.5 border-b border-emerald-100 px-4 py-3 text-xs font-bold text-emerald-800 dark:border-night-700 dark:text-emerald-200">
          <ReceiptText className="h-4 w-4" aria-hidden /> Riwayat Pembayaran DP
        </p>
        {dps.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-500">Belum ada DP yang diajukan.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-night-800">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Pesanan</th>
                <th className="px-4 py-2">Nominal</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {dps.map((d) => {
                const lbl = DP_STATUS[d.status] ?? [d.status, "bg-zinc-100 text-zinc-600"];
                const url = apiAssetUrl(d.bukti);
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-2 font-mono text-xs">{d.id}</td>
                    <td className="px-4 py-2">#{d.pesanan_id} {d.program_nama ?? ""}</td>
                    <td className="px-4 py-2 font-semibold">{rupiah(Number(d.jumlah))}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${lbl[1]}`}>{lbl[0]}</span></td>
                    <td className="px-4 py-2">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline">Lihat</a> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
}
