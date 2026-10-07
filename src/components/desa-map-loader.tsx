"use client";

import dynamic from "next/dynamic";
import type { ApiPetaPohon } from "@/lib/api";
import { useI18n } from "@/components/i18n-provider";

// Leaflet butuh window — dynamic ssr:false harus dari Client Component.
const DesaMap = dynamic(() => import("@/components/desa-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const t = useI18n().dict.pages.lokasiDetail;
  return (
    <div className="flex h-[380px] items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-sm text-zinc-500 sm:h-[460px]">
      {t.mapLoading}
    </div>
  );
}

export default function DesaMapLoader({ desa, pohon }: { desa: string; pohon: ApiPetaPohon[] }) {
  return <DesaMap desa={desa} pohon={pohon} />;
}
