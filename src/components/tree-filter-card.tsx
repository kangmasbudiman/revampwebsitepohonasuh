"use client";

import { useRouter } from "next/navigation";
import { Info, MapPin, RotateCcw, Ruler, SlidersHorizontal, Tag, TreePine } from "lucide-react";

export type FilterDesa = { slug: string; nama: string; provinsi: string | null };

type Props = {
  provinsi: string;
  lokasi: string;
  harga: number;
  diameter: string;
  provinsiList: string[];
  desaList: FilterDesa[];
  hargaList: number[];
  rentangDiameter: { v: string; label: string }[];
  params: Record<string, string | undefined>;
  labels: {
    title: string;
    provinsi: string;
    provinsiHint: string;
    pilihProvinsi: string;
    provinsiCount: string;
    desa: string;
    desaHint: string;
    pilihDesa: string;
    desaDisabled: string;
    desaHelp: string;
    price: string;
    priceHint: string;
    diameter: string;
    diameterHint: string;
    allPrices: string;
    allDiameters: string;
    reset: string;
  };
};

const selectCls =
  "w-full appearance-none rounded-xl border border-emerald-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-emerald-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-night-700 dark:bg-night-950 dark:text-zinc-200";
const pillCls = (on: boolean) =>
  `rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
    on
      ? "bg-emerald-700 text-white"
      : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:bg-night-950"
  }`;

function IkonBox({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
      {children}
    </span>
  );
}

function InfoTeks({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-500">
      <Info className="h-3.5 w-3.5" aria-hidden /> {children}
    </span>
  );
}

export default function TreeFilterCard({
  provinsi,
  lokasi,
  harga,
  diameter,
  provinsiList,
  desaList,
  hargaList,
  rentangDiameter,
  params,
  labels,
}: Props) {
  const router = useRouter();
  const desaOptions = provinsi ? desaList.filter((d) => !d.provinsi || d.provinsi === provinsi) : [];

  function perbarui(patch: Record<string, string | undefined>) {
    const next: Record<string, string | undefined> = { ...params, ...patch };
    delete next.page; // filter mengubah hasil → kembali ke halaman 1
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    const s = sp.toString();
    router.push(s ? `/pohon?${s}` : "/pohon");
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm pa-card dark:border-night-700">
      <div className="flex items-center gap-3 bg-emerald-50/70 px-5 py-4 dark:bg-night-900/40">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-lg font-bold text-emerald-950 dark:text-white">{labels.title}</h2>
      </div>

      {/* Provinsi & Desa */}
      <div className="grid gap-5 px-5 py-4 md:grid-cols-2 md:divide-x md:divide-emerald-100">
        <div className="flex items-start gap-3">
          <IkonBox><MapPin className="h-5 w-5" aria-hidden /></IkonBox>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-emerald-950 dark:text-white">{labels.provinsi}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{labels.provinsiHint}</p>
            <div className="relative mt-3">
              <select
                aria-label={labels.provinsi}
                value={provinsi}
                onChange={(e) => perbarui({ provinsi: e.target.value || undefined, lokasi: undefined })}
                className={selectCls}
              >
                <option value="">{labels.pilihProvinsi}</option>
                {provinsiList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <InfoTeks>{labels.provinsiCount.replaceAll("{n}", String(provinsiList.length))}</InfoTeks>
          </div>
        </div>

        <div className="flex items-start gap-3 md:pl-5">
          <IkonBox><TreePine className="h-5 w-5" aria-hidden /></IkonBox>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-emerald-950 dark:text-white">{labels.desa}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{labels.desaHint}</p>
            <div className="relative mt-3">
              <select
                aria-label={labels.desa}
                value={lokasi}
                disabled={!provinsi}
                onChange={(e) => perbarui({ lokasi: e.target.value || undefined })}
                className={selectCls}
              >
                <option value="">{provinsi ? labels.pilihDesa : labels.desaDisabled}</option>
                {desaOptions.map((d) => (
                  <option key={d.slug} value={d.slug}>{d.nama}</option>
                ))}
              </select>
            </div>
            <InfoTeks>{labels.desaHelp}</InfoTeks>
          </div>
        </div>
      </div>

      {/* Harga */}
      <div className="flex flex-col gap-3 border-t border-emerald-50 px-5 py-4 dark:border-night-800 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3 sm:w-64">
          <IkonBox><Tag className="h-5 w-5" aria-hidden /></IkonBox>
          <div>
            <p className="font-bold text-emerald-950 dark:text-white">{labels.price}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{labels.priceHint}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => perbarui({ harga: undefined })} className={pillCls(!harga)}>
            {labels.allPrices}
          </button>
          {hargaList.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => perbarui({ harga: String(h) })}
              className={pillCls(harga === h)}
            >
              Rp{h.toLocaleString("id-ID")}
            </button>
          ))}
        </div>
      </div>

      {/* Diameter + Reset */}
      <div className="flex flex-col gap-3 border-t border-emerald-50 px-5 py-4 dark:border-night-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 sm:w-64">
            <IkonBox><Ruler className="h-5 w-5" aria-hidden /></IkonBox>
            <div>
              <p className="font-bold text-emerald-950 dark:text-white">{labels.diameter}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{labels.diameterHint}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => perbarui({ diameter: undefined })} className={pillCls(!diameter)}>
              {labels.allDiameters}
            </button>
            {rentangDiameter.map((r) => (
              <button
                key={r.v}
                type="button"
                onClick={() => perbarui({ diameter: r.v })}
                className={pillCls(diameter === r.v)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 lg:border-l lg:border-emerald-100 lg:pl-6">
          <button
            type="button"
            onClick={() => perbarui({ provinsi: undefined, lokasi: undefined, harga: undefined, diameter: undefined })}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> {labels.reset}
          </button>
        </div>
      </div>
    </section>
  );
}
