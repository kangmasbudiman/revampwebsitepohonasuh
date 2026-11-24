"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { bayarDpOnline } from "@/lib/actions/mitra";
import { rupiah } from "@/lib/format";
import { ExternalLink, RefreshCw, Zap } from "lucide-react";

type Pesanan = {
  id: number;
  program_nama: string | null;
  budget: number | null;
  jumlah: number;
  dp_status: string | null;
};

// Kartu pembayaran DP online (Mayar). Webhook hanya Mengubah status DP —
// sertifikat tetap menunggu pelunasan invoice terverifikasi.
export default function OnlinePaymentDp({
  pesanans,
  invoice,
}: {
  pesanans: Pesanan[];
  invoice: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(bayarDpOnline, {});
  const [selected, setSelected] = useState<number | null>(null);
  const [jumlah, setJumlah] = useState<number>(0);

  const pilih = (v: string) => {
    const id = v ? Number(v) : null;
    setSelected(id);
    const p = pesanans.find((x) => x.id === id);
    setJumlah(p?.budget ? Math.round((p.budget * 0.3) / 1000) * 1000 : 0);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-100">
          <Zap className="h-4 w-4 text-emerald-600" aria-hidden /> Bayar Online (QRIS/VA)
        </h3>
        <p className="mt-1 text-xs text-zinc-500">Lunas otomatis via Mayar. Tidak menunggu unggah bukti transfer.</p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pesanan *</span>
        <select
          value={selected ?? ""}
          onChange={(e) => pilih(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        >
          <option value="">Pilih pesanan...</option>
          {pesanans.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.id} — {p.program_nama ?? "Program"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nominal DP (Rp) *</span>
        <input
          type="number"
          min={1}
          value={jumlah || ""}
          onChange={(e) => setJumlah(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        />
        <span className="mt-1 block text-[11px] text-zinc-500">Saran 30% budget program.</span>
      </label>

      {state.link ? (
        <div className="space-y-2">
          <a
            href={state.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Lanjutkan Pembayaran <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Cek Status Pembayaran
          </button>
          <p className="truncate text-[11px] text-zinc-400">{state.link}</p>
        </div>
      ) : (
        <form action={action}>
          <input type="hidden" name="pesanan_id" value={selected ?? ""} />
          <input type="hidden" name="jumlah" value={jumlah} />
          <input type="hidden" name="invoice" value={invoice} />
          <button
            type="submit"
            disabled={!selected || !(jumlah > 0) || pending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap className="h-4 w-4" aria-hidden /> {pending ? "Membuat tagihan…" : "Bayar DP Online"}
          </button>
        </form>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>
      )}
      <p className="text-[10px] text-zinc-400">Estimasi: {rupiah(jumlah)}</p>
    </div>
  );
}
