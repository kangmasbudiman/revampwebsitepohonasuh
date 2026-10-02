"use client";

import dynamic from "next/dynamic";
import type { ApiPetaPohon } from "@/lib/api";

// MapLibre butuh window — dynamic ssr:false harus dari Client Component.
// key={desa}: peta dipasang ulang tiap ganti desa (data & fitBounds baru).
const PetaDesaMap = dynamic(() => import("@/components/admin/peta-desa-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-emerald-100 dark:border-night-700 pa-card-soft text-sm text-zinc-500 dark:text-zinc-400">
      Memuat peta…
    </div>
  ),
});

export default function PetaDesaMapLoader({ desa, pohon }: { desa: string; pohon: ApiPetaPohon[] }) {
  return <PetaDesaMap key={desa} desa={desa} pohon={pohon} />;
}
