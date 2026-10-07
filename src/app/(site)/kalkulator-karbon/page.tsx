import { apiGet, mapSpeciesList } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import CarbonCalculator from "@/components/carbon-calculator";

export async function generateMetadata() {
  const t = (await getDict()).pages.kalkulator;
  return { title: t.title, description: t.metaDesc };
}

export default async function CarbonCalculatorPage() {
  // Rata-rata serapan katalog spesies jadi basis konversi kg CO2 → pohon.
  let avgSerapan = 25;
  try {
    const species = mapSpeciesList(await apiGet<Record<string, unknown>[]>("specieslist"));
    const denganAngka = species.filter((s) => s.serapanKarbon && s.serapanKarbon > 0);
    if (denganAngka.length > 0) {
      avgSerapan = Math.round(
        denganAngka.reduce((sum, s) => sum + (s.serapanKarbon ?? 0), 0) / denganAngka.length,
      );
    }
  } catch {
    // fallback rata-rata bawaan
  }

  const t = (await getDict()).pages.kalkulator;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">{t.intro}</p>

      <div className="mt-10">
        <CarbonCalculator avgSerapan={avgSerapan} />
      </div>
    </main>
  );
}
