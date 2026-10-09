"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sprout } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { ApiAdopsiTerKini } from "@/lib/api";

// Slider "Pengadopsi Terkini" di beranda: kartu bergeser otomatis,
// berhenti saat disentuh/arahkan kursor, bisa digeser manual.
export default function RecentAdopters({ items }: { items: ApiAdopsiTerKini[] }) {
  const { locale, dict } = useI18n();
  const t = dict.home;
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const [hover, setHover] = useState(false);

  const jeda = () => {
    pausedUntil.current = Date.now() + 10_000;
  };

  const geser = (arah: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const target = track.scrollLeft + arah * track.clientWidth * 0.9;
    track.scrollTo({ left: arah > 0 ? Math.min(target, track.scrollWidth) : Math.max(target, 0), behavior: "smooth" });
  };

  useEffect(() => {
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track || hover || Date.now() < pausedUntil.current) return;
      const ujung = track.scrollWidth - track.clientWidth - 4;
      if (track.scrollLeft >= ujung) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: track.clientWidth * 0.9, behavior: "smooth" });
      }
    }, 4000);
    return () => clearInterval(id);
  }, [hover]);

  const fmtTanggal = (tgl: string | null) => {
    if (!tgl) return "";
    const d = new Date(`${tgl}T00:00:00`);
    if (Number.isNaN(d.getTime())) return tgl;
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  return (
    <section
      className="border-b border-emerald-100 bg-emerald-50/70 py-6"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={jeda}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-800">
            <Sprout className="h-4 w-4 text-emerald-500" />
            {t.recentTitle}
          </h2>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label={t.prevSlideAria}
              onClick={() => {
                jeda();
                geser(-1);
              }}
              className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t.nextSlideAria}
              onClick={() => {
                jeda();
                geser(1);
              }}
              className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, i) => (
          <div
            key={`${it.code}-${i}`}
            className="flex min-w-[270px] max-w-[320px] flex-1 snap-start items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm"
          >
            {it.photoUrl && (
              <Image
                src={it.photoUrl}
                alt={it.localName ?? it.code}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-emerald-950">{it.adopter}</p>
              <p className="truncate text-xs text-zinc-600">
                {t.recentAdopts.replaceAll("{tree}", it.localName || it.code)}{" "}
                <span className="font-mono font-semibold text-emerald-700">{it.code}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                <span className="capitalize">{it.desa}</span>
                {it.tanggal ? ` · ${fmtTanggal(it.tanggal)}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
