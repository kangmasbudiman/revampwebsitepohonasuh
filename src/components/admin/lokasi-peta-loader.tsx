"use client";

import dynamic from "next/dynamic";
import type { ApiLokasi, ApiPetaPohon } from "@/lib/api";

// MapLibre butuh window — dynamic ssr:false harus dari Client Component.
const LokasiPeta = dynamic(() => import("@/components/admin/lokasi-peta"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-emerald-100 dark:border-night-700 bg-emerald-50 text-sm text-zinc-500 dark:bg-night-800/50 dark:text-zinc-400">
      Memuat peta…
    </div>
  ),
});

export default function LokasiPetaLoader({
  lokasi,
  pohon,
  focus,
}: {
  lokasi: ApiLokasi[];
  pohon: ApiPetaPohon[];
  focus: string | null;
}) {
  return <LokasiPeta lokasi={lokasi} pohon={pohon} focus={focus} />;
}
