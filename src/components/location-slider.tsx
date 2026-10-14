"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { ApiDesa } from "@/lib/api";
import { namaDesa } from "@/lib/format";

// Section "Lokasi Hutan" di beranda: 4 kartu ber-foto terlihat, sisanya
// bergeser otomatis (pola slider pengadopsi terkini), berhenti saat
// disentuh/arahkan kursor, bisa digeser manual.
export default function LocationSlider({ locations }: { locations: ApiDesa[] }) {
  const { dict } = useI18n();
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
    track.scrollTo({
      left: arah > 0 ? Math.min(target, track.scrollWidth) : Math.max(target, 0),
      behavior: "smooth",
    });
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

  return (
    <section
      data-testid="section-lokasi"
      className="border-y border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white py-20"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={jeda}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-emerald-950">{t.locTitle}</h2>
            <span
              data-testid="jml-lokasi"
              className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
            >
              {locations.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/lokasi"
              className="rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow"
            >
              {t.viewAll}
            </Link>
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
      </div>

      <div
        ref={trackRef}
        className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {locations.map((loc) => {
          const pct = loc.total > 0 ? Math.round((loc.adopted / loc.total) * 100) : 0;
          return (
            <Link
              key={loc.slug}
              href={`/lokasi/${loc.slug}`}
              className="group flex h-full w-[85%] flex-none snap-start flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg sm:w-[calc(50%-12px)] sm:max-w-[380px] lg:w-[calc(25%-18px)] lg:max-w-[340px]"
            >
              <span className="relative block h-40 w-full shrink-0 overflow-hidden">
                <Image
                  src={loc.photoUrl ?? "/images/Lokasi-Pohon-Asuh-2023.jpg"}
                  alt={`Hutan ${namaDesa(loc.name)}`}
                  fill
                  sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 270px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </span>
              <span className="flex flex-1 flex-col p-5">
                <span className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-emerald-950 group-hover:text-emerald-700">
                    {namaDesa(loc.name)}
                  </h3>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {t.locTreeCount.replaceAll("{n}", String(loc.total))}
                  </span>
                </span>
                {loc.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {loc.description}
                  </p>
                )}
                <span className="mt-4 block">
                  <span className="flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {t.locAdoptedAvail
                        .replaceAll("{a}", String(loc.adopted))
                        .replaceAll("{s}", String(loc.available))}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {t.locAdoptedPct.replaceAll("{n}", String(pct))}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </span>
                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-medium text-emerald-700 transition-transform duration-300 group-hover:translate-x-1">
                  <MapPin className="h-4 w-4" /> {t.locVisit}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
