"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { Great_Vibes } from "next/font/google";

// Design story "Bagikan Aksi Saya" (1080×1920 — IG Story / WA Status /
// FB Story), dikalibrasi dari contoh design asli Pohon Asuh: band header
// gelap + logo, nama pengadopsi font script, pita hijau nama pohon, band
// footer nomor sertifikat. Posisi % + font cqw (pola papan taging).
// capture=true → ukuran px persis 1080×1920 untuk render offscreen PNG
// (pola papan-batch-bar); template dirender via next/image agar src-nya
// same-origin /_next/image — syarat html-to-image (asset API tanpa CORS).
// Logo band dirender via CSS background (bukan <img>) agar asersi E2E
// "gradient = tanpa <img>" tetap berlaku.
const script = Great_Vibes({
  weight: "400",
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
      }`}
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
      <div className="absolute inset-x-0 top-[10%] h-[10%] bg-gradient-to-b from-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-[8%] h-[14%] bg-gradient-to-t from-black/50 to-transparent" />

      {/* Band header: logo PA + wordmark + judul */}
      <div className="absolute inset-x-0 top-0 flex h-[10%] items-center gap-[2.2cqw] bg-emerald-950 px-[5%]">
        <span
          aria-hidden
          className="aspect-square h-[68%] shrink-0 bg-[url('/images/logo_putih.png')] bg-contain bg-center bg-no-repeat"
        />
        <span className="text-[2.6cqw] font-extrabold tracking-[0.06em] text-white">
          POHON ASUH
        </span>
        <span className="ml-auto text-[1.45cqw] font-semibold tracking-[0.32em] text-emerald-200/90">
          BAGIKAN AKSI SAYA
        </span>
      </div>

      {/* Nama pengadopsi — script kuning khas design asli */}
      <div className={ZONE} style={{ top: "12.5%", height: "17%" }}>
        <p className={`${script.className} text-[3.6cqw] leading-none text-amber-200/95`}>
          Saya
        </p>
        <div className="mt-[0.5cqw] w-[80%]">
          <FitText
            value={data.nama || "-"}
            className={`${script.className} text-[8cqw] leading-[1.1] text-amber-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]`}
          />
        </div>
        <p className="mt-[0.9cqw] text-[2.3cqw] font-medium text-white/95 drop-shadow">
          telah mengasuh pohon
        </p>
      </div>

      {/* Pita hijau nama pohon */}
      <div className={ZONE} style={{ top: "35%", height: "17%" }}>
        <div className="w-[86%]">
          <div className="rounded-full bg-emerald-600/95 px-[6%] py-[2.2cqw] shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/25">
            <FitText
              value={(data.localName || "-").toUpperCase()}
              className="text-[3.1cqw] font-extrabold tracking-[0.08em] text-white"
            />
          </div>
        </div>
        <p className="mt-[1.6cqw] rounded-full bg-black/35 px-[2.8cqw] py-[0.6cqw] text-[1.9cqw] font-bold tracking-[0.22em] text-emerald-100 backdrop-blur-[2px]">
          {data.idpohon || "-"}
        </p>
        {data.species && (
          <p className="mt-[1.1cqw] text-[2.3cqw] italic text-white/90 drop-shadow">
            {data.species}
          </p>
        )}
        <p className="mt-[0.7cqw] text-[2.1cqw] font-medium text-white/85 drop-shadow">
          {data.desaLabel}
          {data.tglAdopt ? ` • Diadopsi ${fmtTglShare(data.tglAdopt)}` : ""}
        </p>
      </div>

      {/* Memo / pesan untuk hutan */}
      {adaMemo && (
        <div className={ZONE} style={{ top: "60%", height: "18%" }}>
          <div className="w-[74%] rounded-2xl bg-black/30 px-[5%] py-[3%] backdrop-blur-[2px] ring-1 ring-white/15">
            <p className="text-[2.5cqw] leading-snug italic text-emerald-50">
              &ldquo;{memo}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Band footer: nomor sertifikat + situs */}
      <div className="absolute inset-x-0 bottom-0 flex h-[8%] items-center justify-between bg-emerald-950 px-[5%]">
        <span className="text-[1.85cqw] font-semibold tracking-[0.12em] text-white/90">
          {data.certnum}
        </span>
        <span className="text-[1.85cqw] font-bold tracking-[0.08em] text-emerald-300">
          pohonasuh.io
        </span>
      </div>
    </div>
  );
}
