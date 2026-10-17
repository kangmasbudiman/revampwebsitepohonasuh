"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { Great_Vibes } from "next/font/google";

// Design story "Bagikan Aksi Saya" (1080×1920 — IG Story / WA Status /
// FB Story). Dua mode:
// 1) TEMPLATE: template desa adalah design fill-in (ada sendiri: header
//    logo, garis putus ±27%/±39%, kartu statistik berlabel "pohon"/"tahun"
//    + kartu lokasi polos, kartu "Pesan untuk Hutan" bergaris tulis,
//    caption penutup, foto desa) — overlay mengisi zona kosongnya dengan
//    FORMAT HADIAH: nama donatur bold sans gelap rata kiri baseline garis
//    ±27%, kalimat "Menghadiahkan pohon X untuk" ±28-33%, nama penerima
//    baseline garis ±39% (adopsi mandiri: satu nama + "Telah mengasuh"),
//    nilai kartu (jumlah / "Desa X"+subtext hutan / durasi tahun) ±50-56%,
//    memo cursive hijau di garis tulis kartu krem ±65-73%. Zona diukur dari
//    template resmi 900×1600. Halo putih tipis menjaga keterbacaan bila
//    template ternyata foto polos tanpa zona putih.
// 2) GRADIENT (tanpa template): design lengkap bawaan — band header
//    gelap + logo, nama script, pita pohon, band footer.
// Posisi % + font cqw (pola papan taging). capture=true → ukuran px persis
// 1080×1920 untuk render offscreen PNG; template via next/image agar
// same-origin /_next/image — syarat html-to-image (asset API tanpa CORS).
// Logo band dirender via CSS background (bukan <img>) agar asersi E2E
// "gradient = tanpa <img>" tetap berlaku.
const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export type ShareDesignData = {
  nama: string; // penerima hadiah (= pengadopsi bila mandiri)
  donorName?: string | null; // nama member donatur — format hadiah template
  idpohon: string;
  localName: string;
  species: string | null;
  desaLabel: string;
  lokasiSub?: string | null; // subtext kartu lokasi template (mis. hutan adat)
  tglAdopt: string | null;
  memo: string | null;
  certnum: string;
  jmlPohon?: number;
  durasiTahun?: number; // durasi adopsi (kartu "tahun" template)
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
// children bisa mengandung <span> bold; fitKey = teks untuk re-fit.
function FitText({
  children,
  fitKey,
  className,
}: {
  children: React.ReactNode;
  fitKey?: string;
  className?: string;
}) {
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
  }, [fitKey]);
  return (
    <span ref={ref} className={`inline-block max-w-full whitespace-nowrap ${className ?? ""}`}>
      {children}
    </span>
  );
}

const ZONE =
  "absolute inset-x-0 flex flex-col items-center justify-center text-center text-white";

// Halo putih tipis — teks gelap tetap terbaca bila template ternyata foto
// polos (tanpa zona putih untuk diisi).
const HALO =
  "[text-shadow:0_1px_0_rgba(255,255,255,0.85),0_0_12px_rgba(255,255,255,0.7)]";

function DesignRoot({
  capture,
  templateImage,
  desaLabel,
  children,
}: {
  capture: boolean;
  templateImage: string | null;
  desaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-emerald-950 [container-type:inline-size] ${
        capture ? "" : "aspect-[9/16] w-full"
      }`}
      style={capture ? { width: 1080, height: 1920 } : undefined}
    >
      {templateImage ? (
        <Image
          src={templateImage}
          alt={`Template ${desaLabel}`}
          width={1080}
          height={1920}
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#10b981_0%,#065f46_45%,#022c22_100%)]" />
      )}
      {children}
    </div>
  );
}

// ===== Mode TEMPLATE: format hadiah — hanya mengisi zona kosong template =====
function TemplateFillDesign({
  data,
  capture,
}: {
  data: ShareDesignData;
  capture: boolean;
}) {
  const memo = (data.memo ?? "").trim();
  const adaMemo = memo !== "" && memo !== "-" && memo.toLowerCase() !== "null";
  const donor = (data.donorName ?? "").trim();
  const penerima = (data.nama ?? "").trim();
  // Hadiah = ada donor DAN penerima yang berbeda. Adopsi mandiri (nama
  // kosong/fallback = nama member) → cukup satu nama + "Telah mengasuh".
  const hadiah =
    donor !== "" &&
    penerima !== "" &&
    penerima.toLowerCase() !== "null" &&
    penerima.toLowerCase() !== donor.toLowerCase();
  const namaAtas = (hadiah ? donor : penerima) || "-";
  const pohon = data.localName || data.idpohon || "-";
  const durasi = data.durasiTahun && data.durasiTahun > 0 ? data.durasiTahun : 1;
  const lokasiSub = (data.lokasiSub ?? "").trim();
  const jml = String(data.jmlPohon ?? 1);

  return (
    <DesignRoot capture={capture} templateImage={data.templateImage} desaLabel={data.desaLabel}>
      {/* Nama donatur (hadiah) / pengadopsi (mandiri) — bold sans gelap rata
          kiri, baseline di garis putus ±27% (justify-end = duduk di atas garis) */}
      <div
        className="absolute left-[9%] flex w-[82%] flex-col justify-end"
        style={{ top: "19.5%", height: "7.5%" }}
      >
        <FitText
          fitKey={namaAtas}
          className={`text-[5.2cqw] font-extrabold leading-none text-emerald-950 ${HALO}`}
        >
          {namaAtas}
        </FitText>
      </div>

      {/* Kalimat pengantar — nama pohon bold, zona antara garis ±27-39% */}
      <div className="absolute left-[9%] w-[82%]" style={{ top: "28.2%", height: "5.2%" }}>
        <FitText
          fitKey={pohon}
          className={`text-[2.7cqw] font-semibold leading-tight text-emerald-900 ${HALO}`}
        >
          {hadiah ? (
            <>
              Menghadiahkan pohon{" "}
              <span className="font-extrabold text-emerald-950">{pohon}</span> untuk
            </>
          ) : (
            <>
              Telah mengasuh pohon{" "}
              <span className="font-extrabold text-emerald-950">{pohon}</span>
            </>
          )}
        </FitText>
      </div>

      {/* Nama penerima hadiah — baseline di garis putus ±39% */}
      {hadiah && (
        <div
          className="absolute left-[9%] flex w-[82%] flex-col justify-end"
          style={{ top: "33.4%", height: "5.9%" }}
        >
          <FitText
            fitKey={penerima}
            className={`text-[4.6cqw] font-extrabold leading-none text-emerald-950 ${HALO}`}
          >
            {penerima}
          </FitText>
        </div>
      )}

      {/* Kartu 1 — jumlah pohon (label "pohon" & ikon tercetak di template) */}
      <div
        className="absolute flex items-center justify-center text-center"
        style={{ top: "50.5%", height: "5.5%", left: "8.1%", width: "26.3%" }}
      >
        <div className="w-full px-[2%]">
          <FitText
            fitKey={jml}
            className={`text-[3.2cqw] font-extrabold text-emerald-900 ${HALO}`}
          >
            {jml}
          </FitText>
        </div>
      </div>

      {/* Kartu 2 — lokasi: "Desa X" + subtext (kartu polos tanpa label) */}
      <div
        className="absolute flex flex-col items-center justify-center px-[2%] text-center"
        style={{ top: "49.3%", height: "8.7%", left: "35.8%", width: "28.7%" }}
      >
        <FitText
          fitKey={data.desaLabel}
          className={`text-[2.9cqw] font-extrabold leading-tight text-emerald-900 ${HALO}`}
        >
          Desa {data.desaLabel || "-"}
        </FitText>
        {lokasiSub !== "" && (
          <p
            className={`mt-[0.5cqw] line-clamp-2 text-[1.7cqw] font-medium leading-tight text-emerald-800/90 ${HALO}`}
          >
            {lokasiSub}
          </p>
        )}
      </div>

      {/* Kartu 3 — durasi (label "tahun" & ikon tercetak di template) */}
      <div
        className="absolute flex items-center justify-center text-center"
        style={{ top: "50.5%", height: "5.5%", left: "65.8%", width: "26.3%" }}
      >
        <div className="w-full px-[2%]">
          <FitText
            fitKey={String(durasi)}
            className={`text-[3.2cqw] font-extrabold text-emerald-900 ${HALO}`}
          >
            {durasi}
          </FitText>
        </div>
      </div>

      {/* Memo — tulisan tangan cursive hijau di garis tulis kartu
          "Pesan untuk Hutan" (judul sudah tercetak) */}
      {adaMemo && (
        <div
          className="absolute inset-x-0 flex items-center justify-center px-[14%] text-center"
          style={{ top: "64.6%", height: "8.6%" }}
        >
          <p
            className={`${script.className} line-clamp-3 text-[3.4cqw] leading-[1.5] text-emerald-800 ${HALO}`}
          >
            {memo}
          </p>
        </div>
      )}

      {/* Nomor sertifikat kecil di atas foto desa (caption penutup sudah
          tercetak di template) — pil gelap agar terbaca di template apa pun */}
      <div className="absolute inset-x-0 bottom-[1.2%] flex justify-center">
        <span className="rounded-full bg-emerald-950/75 px-[2.6cqw] py-[0.8cqw] text-[1.8cqw] font-semibold tracking-[0.14em] text-white/95 backdrop-blur-[2px]">
          {data.certnum} &nbsp;•&nbsp; pohonasuh.io
        </span>
      </div>
    </DesignRoot>
  );
}

// ===== Mode GRADIENT: design lengkap bawaan (tanpa template) =====
function GradientDesign({
  data,
  capture,
}: {
  data: ShareDesignData;
  capture: boolean;
}) {
  const memo = (data.memo ?? "").trim();
  const adaMemo = memo !== "" && memo !== "-" && memo.toLowerCase() !== "null";

  return (
    <DesignRoot capture={capture} templateImage={null} desaLabel={data.desaLabel}>
      {/* Scrim agar teks terbaca di atas gradient */}
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
            fitKey={data.nama}
            className={`${script.className} text-[8cqw] leading-[1.1] text-amber-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]`}
          >
            {data.nama || "-"}
          </FitText>
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
              fitKey={data.localName}
              className="text-[3.1cqw] font-extrabold tracking-[0.08em] text-white"
            >
              {(data.localName || "-").toUpperCase()}
            </FitText>
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
    </DesignRoot>
  );
}

export default function ShareDesign({
  data,
  capture = false,
}: {
  data: ShareDesignData;
  capture?: boolean;
}) {
  return data.templateImage ? (
    <TemplateFillDesign data={data} capture={capture} />
  ) : (
    <GradientDesign data={data} capture={capture} />
  );
}
