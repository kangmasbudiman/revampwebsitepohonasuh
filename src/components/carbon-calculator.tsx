"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Car, Leaf, Plane, Plug, TreeDeciduous, Zap } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

// Faktor emisi rata-rata Indonesia (kg CO2e per satuan):
// mobil bensin 0,20/kg per km; motor 0,09; listrik PLN (Jawa) 0,87 per kWh;
// penerbangan penumpang ±90 per jam terbang. Estimasi — bukan pengukuran.
const FAKTOR = {
  mobil: 0.2, // per km
  motor: 0.09, // per km
  listrik: 0.87, // per kWh
  terbang: 90, // per jam
} as const;

const AKTIVITAS = [
  { key: "mobil" as const, icon: Car, contoh: "50" },
  { key: "motor" as const, icon: Zap, contoh: "100" },
  { key: "listrik" as const, icon: Plug, contoh: "250" },
  { key: "terbang" as const, icon: Plane, contoh: "4" },
];

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export default function CarbonCalculator({ avgSerapan }: { avgSerapan: number }) {
  const t = useI18n().dict.pages.kalkulator;
  const [nilai, setNilai] = useState<Record<(typeof AKTIVITAS)[number]["key"], string>>({
    mobil: "",
    motor: "",
    listrik: "",
    terbang: "",
  });

  const labelOf = (key: (typeof AKTIVITAS)[number]["key"]) =>
    key === "mobil"
      ? t.actCar
      : key === "motor"
        ? t.actMotor
        : key === "listrik"
          ? t.actElectricity
          : t.actFlight;
  const satuanOf = (key: (typeof AKTIVITAS)[number]["key"]) =>
    key === "listrik" ? t.unitKwhMonth : key === "terbang" ? t.unitHourYear : t.unitKmWeek;

  const hasil = useMemo(() => {
    const perAktivitas = AKTIVITAS.map((a) => {
      const n = Number(nilai[a.key].replace(",", "."));
      const satuanTahun =
        a.key === "listrik" ? (Number.isFinite(n) ? n : 0) * 12 : a.key === "terbang" ? (Number.isFinite(n) ? n : 0) : (Number.isFinite(n) ? n : 0) * 52;
      return { key: a.key, kg: satuanTahun * FAKTOR[a.key] };
    });
    const total = perAktivitas.reduce((s, x) => s + x.kg, 0);
    return { perAktivitas, total, pohon: total > 0 ? Math.ceil(total / avgSerapan) : 0 };
  }, [nilai, avgSerapan]);

  const inputCls =
    "mt-1 w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm text-emerald-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h2 className="text-lg font-semibold text-emerald-950">{t.yourActivity}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t.activityHint}</p>
        <div className="mt-5 space-y-4">
          {AKTIVITAS.map((a) => (
            <div key={a.key}>
              <label
                htmlFor={`input-${a.key}`}
                className="flex items-center gap-2 text-sm font-medium text-emerald-900"
              >
                <a.icon className="h-4 w-4 text-emerald-600" />
                {labelOf(a.key)} <span className="font-normal text-zinc-400">({satuanOf(a.key)})</span>
              </label>
              <input
                id={`input-${a.key}`}
                type="number"
                min={0}
                inputMode="decimal"
                placeholder={t.placeholderEx.replaceAll("{n}", a.contoh)}
                value={nilai[a.key]}
                onChange={(e) => setNilai((v) => ({ ...v, [a.key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-emerald-950">{t.resultTitle}</h2>
        <div className="mt-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80">
            {t.emissionYear}
          </p>
          <p className="mt-2 text-5xl font-bold text-emerald-700" data-testid="total-emisi">
            {nf.format(hasil.total)}
          </p>
          <p className="text-sm text-zinc-500">{t.kgYear}</p>

          {hasil.total > 0 && (
            <>
              <div className="mt-5 space-y-2">
                {hasil.perAktivitas
                  .filter((x) => x.kg > 0)
                  .sort((a, b) => b.kg - a.kg)
                  .map((x) => {
                    const pct = Math.round((x.kg / hasil.total) * 100);
                    return (
                      <div key={x.key}>
                        <div className="flex justify-between text-xs text-zinc-600">
                          <span>{labelOf(x.key)}</span>
                          <span>
                            {nf.format(x.kg)} kg ({pct}%)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-6 rounded-2xl bg-white px-4 py-4 shadow-sm">
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-900">
                  <TreeDeciduous className="h-4 w-4 text-emerald-600" />
                  {t.equivalent}
                </p>
                <p className="mt-1 text-3xl font-bold text-emerald-700" data-testid="pohon-offset">
                  {hasil.pohon} {hasil.pohon === 1 ? t.treeWord : t.treesWord}
                </p>
                <p className="text-xs text-zinc-500">
                  {t.equivalentNote.replaceAll("{avg}", String(avgSerapan))}
                </p>
              </div>

              <Link
                href="/pohon"
                className="mt-5 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:bg-emerald-700"
              >
                <Leaf className="h-4 w-4" />
                {t.adoptNow.replaceAll("{n}", String(hasil.pohon))}
              </Link>
              <Link
                href="/spesies"
                className="mt-3 block text-center text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
              >
                {t.knowSpecies}
              </Link>
            </>
          )}
          {hasil.total === 0 && (
            <p className="mt-4 text-sm text-zinc-500">{t.emptyResult}</p>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-400">{t.disclaimer}</p>
      </div>
    </div>
  );
}
