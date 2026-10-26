// Estimasi CO₂ terserap per pohon dari diameter batang.
//
// Persamaan alometrik Brown 1997 (FAO Forestry Paper 134) untuk pohon hutan
// tropis lembap yang hanya membutuhkan diameter:
//   biomassa (kg) = exp(-2,134 + 2,53 × ln D)
// Karbon = 47% biomassa (fraksi default IPCC 2006), CO₂ = karbon × 44/12.
// Valid untuk D 5–148 cm — di bawahnya dipatok 5 cm, di atasnya diekstrapolasi.
// Hasil = total serapan seumur hidup pohon (bukan per tahun).
import type { Locale } from "@/lib/i18n";

export function co2TotalKg(diameterCm: number | null | undefined): number | null {
  const d = Number(diameterCm);
  if (!Number.isFinite(d) || d <= 0) return null;
  const agb = Math.exp(-2.134 + 2.53 * Math.log(Math.max(5, d)));
  return Math.round((agb * 0.47 * 44) / 12);
}

export function formatCo2(kg: number, locale: Locale): string {
  const loc = locale === "en" ? "en-GB" : "id-ID";
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString(loc, { maximumFractionDigits: 1 })} ton`;
  }
  return `${kg.toLocaleString(loc)} kg`;
}
