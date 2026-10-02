"use client";

import { useLayoutEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import type { ApiOrderRow } from "@/lib/api";

// Desain papan taging disalin dari mobile (download_form_taging): template
// 2382×1684 + overlay pada posisi pecahan ukuran papan. Rasio papan tetap,
// jadi ukuran font berbasis tinggi papan dikonversi ke cqw (×1684/2382).
const playfair = Playfair_Display({
  weight: ["700", "900"],
  subsets: ["latin"],
  display: "swap",
});

// FittedBox.scaleDown ala mobile — teks menyusut agar selalu muat satu baris.
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

function kapital(s: string) {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return t;
  return t
    .split(" ")
    .map((w) => (w ? `${w[0].toUpperCase()}${w.slice(1).toLowerCase()}` : w))
    .join(" ");
}

// "2027-02-13" → "13 Feb 2027" (bulan pendek ID); gagal parse → mentah.
function fmtBerlaku(raw: string | null) {
  const t = (raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (!m) return t;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const mm = Number(m[2]);
  return `${m[3]} ${mm >= 1 && mm <= 12 ? bulan[mm - 1] : ""} ${m[1]}`.trim();
}

export default function PapanTaging({ order }: { order: ApiOrderRow }) {
  const namaDesa = kapital(order.desa);
  const subLokasi = [
    order.kecamatan.trim() && `Kec. ${kapital(order.kecamatan)}`,
    order.kabupaten.trim() && `Kab. ${kapital(order.kabupaten)}`,
    order.provinsi.trim() && `Provinsi ${kapital(order.provinsi)}`,
  ]
    .filter(Boolean)
    .join(", ");

  const baris: { label: string; nilai: string; italic?: boolean }[] = [
    { label: "ID", nilai: order.idpohon || "-" },
    { label: "Nama Pohon", nilai: order.localName || "-", italic: true },
    { label: "Diameter", nilai: `${order.diameter || 0} Cm` },
    { label: "Koordinat", nilai: `${order.lng ?? "-"}°, ${order.lat ?? "-"}°` },
    { label: "Berlaku", nilai: fmtBerlaku(order.tglExp) || "-" },
  ];

  return (
    <div>
      <div className="pa-papan-wrap mx-auto w-full max-w-4xl overflow-hidden rounded-xl shadow-sm">
        <div
          className={`pa-papan relative aspect-[2382/1684] w-full [container-type:inline-size] ${playfair.className}`}
        >
          {/* Template papan — <img> polos agar cetak memakai berkas aslinya. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/papan-taging.png"
            alt="Template papan taging"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div
            className="absolute inset-x-0 text-center leading-[1.1] font-bold text-[#161616]"
            style={{ top: "16.8%" }}
          >
            <div className="mx-auto max-w-[90%]">
              <FitText value={namaDesa ? `Desa ${namaDesa}` : "Desa -"} className="text-[2.47cqw]" />
            </div>
          </div>

          {subLokasi && (
            <div
              className="absolute inset-x-0 text-center leading-[1.1] font-bold text-[#161616]"
              style={{ top: "24.3%" }}
            >
              <div className="mx-auto max-w-[90%]">
                <FitText value={subLokasi} className="text-[2.05cqw]" />
              </div>
            </div>
          )}

          <div
            className="absolute inset-x-0 flex items-center justify-center leading-[1.1] font-bold text-[#161616]"
            style={{ top: "30.5%", height: "12.9%" }}
          >
            <div className="max-w-[72%]">
              <FitText value={order.nama || "-"} className="text-[2.9cqw]" />
            </div>
          </div>

          {baris.map((b, i) => (
            <div
              key={b.label}
              className="absolute left-0 flex w-full items-baseline leading-[1.1] font-bold text-[#161616]"
              style={{ top: `${52.75 + 7.93 * i}%`, paddingLeft: "7.98%" }}
            >
              <span className="w-[22.5%] shrink-0 text-[2.19cqw]">{b.label}</span>
              <span className="text-[2.19cqw]">:&nbsp;&nbsp;</span>
              <span className={`min-w-0 ${i === 4 ? "max-w-[40%]" : "max-w-[52%]"}`}>
                <FitText value={b.nilai} className={`text-[2.19cqw] ${b.italic ? "italic" : ""}`} />
              </span>
            </div>
          ))}

          <div className="absolute" style={{ left: "82.8%", top: "86.5%", width: "5.44cqw" }}>
            <QRCodeSVG
              value={`https://www.google.com/maps/search/?api=1&query=${order.lat ?? ""},${order.lng ?? ""}`}
              size={256}
              level="L"
              bgColor="#ffffff"
              fgColor="#161616"
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#249689] to-[#10791D] px-6 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
        >
          <Printer className="h-4 w-4" /> Cetak / Simpan PDF
        </button>
        <p className="w-full text-center text-xs text-zinc-500 dark:text-zinc-400">
          Ukuran cetak A4 lanskap — sama seperti papan fisik yang ditempel di pohon.
        </p>
      </div>
    </div>
  );
}
