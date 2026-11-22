"use client";

import { useRouter } from "next/navigation";
import { requestPesananMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { MapPin } from "lucide-react";
import { namaDesa } from "@/lib/format";

// Form pesan pemesanan pohon — pilihan pohon sudah dilakukan admin
// (admin akan memilih pohon tersedia), jadi form ini hanya isian lokasi,
// jumlah pohon, program & catatan.
export default function MitraPohonOrderForm({
  desas,
  programs,
  desaActive = "",
}: {
  desas: { id: number; name: string }[];
  programs: { id: number; nama: string }[];
  desaActive?: string;
}) {
  const router = useRouter();
  const desa = desaActive; // derived from URL — navigasi memicu re-fetch server-side

  return (
    <form action={requestPesananMitra} className="mt-6 space-y-4">
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300"><MapPin className="h-4 w-4" />Lokasi / Desa (opsional)</span>
            <select
              name="desa"
              value={desa}
              onChange={(e) => {
                const v = e.target.value;
                router.push(`/mitra/pesanan?desa=${encodeURIComponent(v)}`);
              }}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
            >
              <option value="">Semua lokasi</option>
              {desas.map((d) => (
                <option key={d.id} value={d.name}>{namaDesa(d.name)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Program (opsional)</span>
            <select name="program_id" defaultValue="0" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
              <option value="0">— Tanpa program —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Catatan (opsional)</span>
          <input
            name="catatan"
            placeholder="mis. minimal diameter 30cm, prioritaskan desa X"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
        </label>
      </div>

      {/* Jumlah pohon — admin memilih pohon tersedia sesuai pesanan */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Jumlah pohon *</span>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Admin akan memilih pohon tersedia sesuai permintaan Anda.
            </p>
          </div>
          <input
            name="jumlah"
            type="number"
            min={1}
            max={500}
            defaultValue={10}
            required
            className="w-32 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
        </div>
        <SubmitButton pendingLabel="Mengirim pesanan…" className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700">
          Kirim Permintaan Pemesanan
        </SubmitButton>
      </div>
    </form>
  );
}
