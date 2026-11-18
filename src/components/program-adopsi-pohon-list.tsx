"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { TreePine, FolderOpen } from "lucide-react";
import { namaDesa } from "@/lib/format";

export type ProgramTreeMini = {
  idpohon: string;
  localName: string;
  species: string | null;
  desa: string;
  diameterCm: number | null;
  heightM: number | null;
  photoUrl: string | null;
  status: "reserved" | "adopted" | string;
  harga: number | null;
};

const ASSET_ORIGIN = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

export default function ProgramAdopsiPohonList({ programId, mitraId }: { programId: number; mitraId?: number }) {
  const [data, setData] = useState<{ trees: ProgramTreeMini[]; summary: { total: number; reserved: number; adopted: number } | null }>({ trees: [], summary: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!programId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/program-pohon?program_id=${programId}${mitraId ? `&mitra_id=${mitraId}` : ""}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setData({
            trees: Array.isArray(json?.data) ? (json.data as ProgramTreeMini[]) : [],
            summary: json?.summary ?? null,
          });
        }
      } catch {
        // abaikan
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [programId, mitraId]);

  if (!programId) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 px-4 py-3 text-xs text-zinc-500">
        <FolderOpen className="h-4 w-4 text-emerald-300" aria-hidden /> Pilih program dulu — pohon di dalam program akan tampil di sini.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-xs text-zinc-500 animate-pulse">
        Memuat pohon program…
      </p>
    );
  }

  const { trees, summary } = data;

  if (trees.length === 0) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 px-4 py-3 text-xs text-zinc-500">
        <TreePine className="h-4 w-4 text-emerald-300" aria-hidden /> Belum ada pohon di program ini — ajukan pohon lewat menu Pemesanan Pohon.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-3 dark:border-night-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
          <TreePine className="h-4 w-4" aria-hidden />Pohon dalam Program
        </p>
        {summary && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-zinc-600 ring-1 ring-emerald-100">
            {summary.reserved} dipesan · {summary.adopted} diadopsi
          </span>
        )}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {trees.map((t) => (
          <li
            key={t.idpohon}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-night-700 dark:bg-night-900"
          >
            <span className="relative h-16 w-full overflow-hidden bg-emerald-50">
              {t.photoUrl ? (
                <Image
                  src={t.photoUrl && /^https?:/.test(t.photoUrl) ? t.photoUrl : `${ASSET_ORIGIN}/${String(t.photoUrl).replace(/^\//, "")}`}
                  alt={t.localName}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-2xl">🌳</span>
              )}
              <span className={`absolute right-1.5 top-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold text-white shadow ${t.status === "adopted" ? "bg-emerald-700" : "bg-amber-500"}`}>
                {t.status === "adopted" ? "Diadopsi" : "Dipesan"}
              </span>
            </span>
            <span className="flex flex-1 flex-col gap-0.5 p-2">
              <span className="flex items-start justify-between gap-1">
                <span className="truncate text-[11px] font-bold text-emerald-950">{t.localName}</span>
                <span className="shrink-0 whitespace-nowrap font-mono text-[9px] text-emerald-800">{t.idpohon}</span>
              </span>
              <span className="truncate text-[9px] italic text-zinc-500">{t.species ?? "—"}</span>
              <span className="truncate text-[9px] text-zinc-500">📍 {namaDesa(t.desa)}</span>
              {t.diameterCm != null && (
                <span className="truncate text-[9px] text-zinc-500">Ø {t.diameterCm} cm{t.heightM != null ? ` · T ${t.heightM} m` : ""}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
