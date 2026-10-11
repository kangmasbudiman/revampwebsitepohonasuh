"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

// Popup galeri semua foto satu laporan: navigasi panah/klik strip, Escape &
// backdrop menutup, scroll body dikunci saat terbuka.
export default function LaporanFotoPopup({
  judul,
  fotos,
  start = 0,
  onClose,
}: {
  judul: string;
  fotos: { id: number; url: string }[];
  start?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(Math.min(Math.max(start, 0), fotos.length - 1));

  useEffect(() => {
    setIdx(Math.min(Math.max(start, 0), fotos.length - 1));
  }, [start, fotos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, fotos.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fotos.length, onClose]);

  if (fotos.length === 0) return null;
  const f = fotos[idx];

  return (
    <div
      role="dialog"
      aria-label={`Galeri foto laporan ${judul}`}
      data-testid="popup-foto-laporan"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              <Images className="h-4 w-4" aria-hidden />
              Galeri Foto
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{judul}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              data-testid="popup-foto-counter"
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tabular-nums"
            >
              {idx + 1} / {fotos.length}
            </span>
            <button
              type="button"
              aria-label="Tutup galeri foto"
              onClick={onClose}
              className="rounded-full bg-white/15 p-2 hover:bg-white/25"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center">
          {fotos.length > 1 && (
            <button
              type="button"
              aria-label="Foto sebelumnya"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(i - 1, 0))}
              className="absolute left-0 z-10 rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
          )}
          <div key={f.id} className="relative h-[62dvh] w-full" data-foto-utama>
            <Image
              src={f.url}
              alt={`Foto ${idx + 1} laporan ${judul}`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="rounded-2xl object-contain"
              priority
            />
          </div>
          {fotos.length > 1 && (
            <button
              type="button"
              aria-label="Foto berikutnya"
              disabled={idx === fotos.length - 1}
              onClick={() => setIdx((i) => Math.min(i + 1, fotos.length - 1))}
              className="absolute right-0 z-10 rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          )}
        </div>

        {fotos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {fotos.map((t, i) => (
              <button
                key={t.id}
                type="button"
                aria-label={`Lihat foto ${i + 1}`}
                aria-current={i === idx}
                onClick={() => setIdx(i)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition-colors ${
                  i === idx
                    ? "ring-emerald-400"
                    : "ring-transparent hover:ring-white/40"
                }`}
              >
                <Image
                  src={t.url}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
