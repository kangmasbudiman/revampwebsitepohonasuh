"use client";

import dynamic from "next/dynamic";
import type { ApiPosisiPetugas } from "@/lib/api";

// Leaflet butuh window — dynamic ssr:false harus dari Client Component.
const PosisiMap = dynamic(() => import("@/components/admin/posisi-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-emerald-100 dark:border-night-700 bg-emerald-50 dark:bg-night-800/50 dark:bg-night-800/50 text-sm text-zinc-500 dark:text-zinc-400">
      Memuat peta…
    </div>
  ),
});

export default function PosisiMapLoader({ petugas }: { petugas: ApiPosisiPetugas[] }) {
  return <PosisiMap petugas={petugas} />;
}
