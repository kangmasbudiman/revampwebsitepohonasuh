import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import type { ApiLaporan } from "@/lib/api";
import { namaDesa } from "@/lib/format";

// Rentang tanggal laporan → label pendek per locale ("3 Okt 2026 – 5 Okt 2026").
export function periodeLaporan(
  tanggal: string,
  tanggalSelesai: string,
  locale: "id" | "en",
): string {
  const fmt = (v: string) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  };
  const a = fmt(tanggal);
  const b = fmt(tanggalSelesai);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b;
}

export function excerptLaporan(isi: string, max = 140): string {
  const teks = isi.replace(/\s+/g, " ").trim();
  return teks.length > max ? teks.slice(0, max).trimEnd() + "…" : teks;
}

// Kartu horizontal laporan (thumbnail kiri, teks kanan) — dipakai section
// beranda & halaman publik /laporan.
export default function LaporanCard({
  laporan,
  locale,
  verifiedLabel,
}: {
  laporan: ApiLaporan;
  locale: "id" | "en";
  verifiedLabel: string;
}) {
  const foto = laporan.foto[0]?.url;
  const meta = [
    laporan.desa.trim() ? namaDesa(laporan.desa) : "",
    periodeLaporan(laporan.tanggal, laporan.tanggalSelesai, locale),
  ].filter(Boolean);

  return (
    <Link
      href={`/laporan/${laporan.slug || laporan.id}`}
      className="group relative flex items-stretch gap-4 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        {verifiedLabel}
      </span>
      <div className="relative h-[84px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-[90px] sm:w-[150px]">
        {foto ? (
          <Image
            src={foto}
            alt=""
            fill
            sizes="150px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl" aria-hidden>
            🌳
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 pr-24 font-bold text-emerald-950 transition-colors group-hover:text-emerald-700">
          {laporan.judul}
        </h3>
        {meta.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-emerald-700">
            {laporan.desa.trim() && <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {meta.join(" • ")}
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
          {excerptLaporan(laporan.isi)}
        </p>
      </div>
      <ArrowRight
        className="hidden h-5 w-5 shrink-0 self-center text-emerald-600 transition-transform duration-300 group-hover:translate-x-1 sm:block"
        aria-hidden
      />
    </Link>
  );
}
