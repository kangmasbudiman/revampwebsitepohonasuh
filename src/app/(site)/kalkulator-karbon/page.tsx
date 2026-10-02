import { apiGet, mapSpeciesList } from "@/lib/api";
import CarbonCalculator from "@/components/carbon-calculator";

export const metadata = {
  title: "Kalkulator Karbon",
  description:
    "Hitung perkiraan jejak karbon tahunan dari aktivitas sehari-hari dan imbangi dengan mengadopsi pohon di hutan Pohon Asuh.",
};

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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">Kalkulator Karbon</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Jejak karbon Anda dari kendaraan, listrik, dan penerbangan bisa diimbangi dengan pohon
        yang menyerap CO₂ di habitat aslinya. Hitung perkiraannya, lalu mulai adopsi.
      </p>

      <div className="mt-10">
        <CarbonCalculator avgSerapan={avgSerapan} />
      </div>
    </main>
  );
}
