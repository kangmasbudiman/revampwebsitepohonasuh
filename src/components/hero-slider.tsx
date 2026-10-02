"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Leaf } from "lucide-react";

export type HeroSlide = {
  image: string;
  eyebrow?: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
};

const AUTOPLAY_MS = 6500;

export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [go, paused, index]);

  return (
    <section
      className="relative h-[640px] w-full overflow-hidden bg-emerald-950 sm:h-[720px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Sorotan program Pohon Asuh"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.image}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              active ? "z-10 opacity-100" : "z-0 opacity-0"
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              priority={i === 0}
              sizes="100vw"
              className={`object-cover ${active ? "animate-kenburns" : ""}`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/55 to-emerald-950/20" />

            {active && (
              <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-4">
                <p
                  className="hero-anim flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300"
                >
                  <Leaf className="h-4 w-4 animate-float-soft" />
                  {slide.eyebrow}
                </p>
                <h1
                  className="hero-anim mt-4 max-w-2xl text-4xl font-bold leading-tight text-white drop-shadow-md sm:text-5xl"
                  style={{ animationDelay: "150ms" }}
                >
                  {slide.title}
                </h1>
                <p
                  className="hero-anim mt-5 max-w-xl text-lg leading-8 text-emerald-100"
                  style={{ animationDelay: "300ms" }}
                >
                  {slide.description}
                </p>
                <div
                  className="hero-anim mt-8 flex flex-wrap gap-3"
                  style={{ animationDelay: "450ms" }}
                >
                  <Link
                    href={slide.cta.href}
                    className="rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.03] hover:bg-emerald-400"
                  >
                    {slide.cta.label}
                  </Link>
                  {slide.secondary && (
                    <Link
                      href={slide.secondary.href}
                      className="rounded-full border border-emerald-300/50 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:scale-[1.03] hover:bg-white/10"
                    >
                      {slide.secondary.label}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Slide sebelumnya"
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Slide berikutnya"
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.image}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ke slide ${i + 1}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? "w-9 bg-emerald-400" : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
