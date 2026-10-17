"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";

// Design story "Bagikan Aksi Saya" (1080×1920 — IG Story / WA Status /
// FB Story). Layout bersih sementara: brand atas, nama pengadopsi, kartu
// info pohon, memo, CTA bawah — posisi % + font cqw (pola papan taging)
// sehingga mudah dikalibrasi ke contoh design asli nanti.
// capture=true → ukuran px persis 1080×1920 untuk render offscreen PNG
// (pola papan-batch-bar); template dirender via next/image agar src-nya
// same-origin /_next/image — syarat html-to-image (asset API tanpa CORS).
const playfair = Playfair_Display({
  weight: ["600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export type ShareDesignData = {
  nama: string;
  idpohon: string;
  localName: string;
  species: string | null;
  desaLabel: string;
  tglAdopt: string | null;
  memo: string | null;
  certnum: string;
  templateImage: string | null; // imageUrl template desa; null = gradient
};

// "2027-02-13" → "13 Feb 2027"; gagal parse → mentah.
export function fmtTglShare(raw: string | null): string {
  const t = (raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (!m) return t;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const mm = Number(m[2]);
  return `${m[3]} ${mm >= 1 && mm <= 12 ? bulan[mm - 1] : ""} ${m[1]}`.trim();
}

// FittedBox.scaleDown ala papan — teks menyusut agar muat satu baris.
function FitText({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const fit = () => {
      el.style.removeProperty("font-size");
      const base = parseFloat(getComputedStyle(el).fontSize);
      if (el.scrollWidth > parent.clientWidth) {
        el.style.fontSize = `${Math.max(base * 0.45, Math.floor(base * (parent.clientWidth / el.scrollWidth)))}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [value]);
  return (
    <span ref={ref} className={`inline-block max-w-full whitespace-nowrap ${className ?? ""}`}>
      {value}
    </span>
  );
}

const ZONE =
  "absolute inset-x-0 flex flex-col items-center justify-center text-center text-white";

export default function ShareDesign({ data, capture = false }: { data: ShareDesignData; capture?: boolean }) {
  const memo = (data.memo ?? "").trim();
  const adaMemo = memo !== "" && memo !== "-" && memo.toLowerCase() !== "null";

  return (
    <div
      className={`relative overflow-hidden bg-emerald-950 [container-type:inline-size] ${
        capture ? "" : "aspect-[9/16] w-full"
      } ${playfair.className}`}
      style={capture ? { width: 1080, height: 1920 } : undefined}
    >
      {data.templateImage ? (
        <Image
          src={data.templateImage}
          alt={`Template ${data.desaLabel}`}
          width={1080}
          height={1920}
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#10b981_0%,#065f46_45%,#022c22_100%)]" />
      )}

      {/* Scrim agar teks terbaca di atas foto template apa pun */}
      <div className="absolute inset-x-0 top-0 h-[26%] bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/65 to-transparent" />

      {/* Brand */}
      <div className={ZONE} style={{ top: "3.2%", height: "6%" }}>
        <p className="text-[2.4cqw] font-bold tracking-[0.42em] text-emerald-100">POHON ASUH</p>
        <p className="mt-[0.4cqw] text-[1.7cqw] font-semibold tracking-[0.18em] text-emerald-200/90">
          BAGIKAN AKSI SAYA
        </p>
      </div>

      {/* Nama pengadopsi */}
      <div className={ZONE} style={{ top: "11.5%", height: "10%" }}>
        <p className="text-[2.1cqw] font-semibold tracking-[0.22em] text-emerald-200">SAYA</p>
        <div className="mt-[0.8cqw] w-[78%]">
          <FitText value={data.nama || "-"} className="text-[6.4cqw] font-black leading-tight drop-shadow-lg" />
        </div>
        <p className="mt-[0.8cqw] text-[2.5cqw] font-medium text-white/90">mengasuh pohon di hutan desa</p>
      </div>

      {/* Kartu info pohon */}
      <div
        className="absolute inset-x-[10%] overflow-hidden rounded-[3cqw] border border-white/25 bg-black/35 shadow-2xl backdrop-blur-[2px]"
        style={{ top: "30%", height: "34%" }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-[1.1cqw] px-[6%] text-center">
          <span className="rounded-full bg-emerald-500/90 px-[2.6cqw] py-[0.7cqw] text-[1.9cqw] font-bold tracking-widest text-white">
            {data.idpohon || "-"}
          </span>
          <div className="w-full">
            <FitText
              value={data.localName || "-"}
              className="text-[5.6cqw] font-bold italic leading-tight text-emerald-50"
            />
          </div>
          {data.species && (
            <p className="text-[2.2cqw] text-white/80">{data.species}</p>
          )}
          <p className="text-[2.6cqw] font-semibold text-emerald-200">{data.desaLabel}</p>
          {data.tglAdopt && (
            <p className="text-[1.9cqw] text-white/70">Diadopsi {fmtTglShare(data.tglAdopt)}</p>
          )}
        </div>
      </div>

      {/* Memo / pesan untuk hutan */}
      {adaMemo && (
        <div className={ZONE} style={{ top: "68%", height: "16%" }}>
          <div className="w-[76%]">
            <p className="text-[2.6cqw] leading-snug italic text-emerald-50 drop-shadow">
              &ldquo;{memo}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* CTA bawah */}
      <div className={ZONE} style={{ top: "90.5%", height: "7%" }}>
        <p className="text-[1.8cqw] font-semibold tracking-[0.14em] text-white/85">
          {data.certnum}
        </p>
        <p className="mt-[0.5cqw] text-[1.7cqw] text-emerald-200/90">
          Verifikasi & adopsi pohonmu di pohonasuh.io
        </p>
      </div>
    </div>
  );
}
