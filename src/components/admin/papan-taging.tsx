"use client";

import { useLayoutEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import type { ApiOrderRow } from "@/lib/api";
import { sebutanDesa } from "@/lib/format";

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

// Memo panjang dibungkus maksimal DUA baris dengan pembatas tegas sebelum
// kolom QR: coba dulu satu baris (menyusut s.d. 75%), bila tidak muat
// bungkus dua baris (font maks agar kedua baris tetap di dalam kartu,
// minimum 50%); lebih panjang dari itu diakhiri "…".
function MemoFit({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const ukur = <T,>(fn: () => T): T => {
      el.style.display = "block";
      el.style.webkitLineClamp = "unset";
      try {
        return fn();
      } finally {
        el.style.display = "";
        el.style.webkitLineClamp = "";
      }
    };
    const fit = () => {
      el.style.removeProperty("font-size");
      ukur(() => {
        const base = parseFloat(getComputedStyle(el).fontSize);
        // Satu baris dulu — bila muat dengan pengecilan wajar, selesai.
        el.style.whiteSpace = "nowrap";
        let f = base;
        while (f > base * 0.75 && el.scrollWidth > el.clientWidth) {
          f -= 0.25;
          el.style.fontSize = `${f}px`;
        }
        const muatSatuBaris = el.scrollWidth <= el.clientWidth;
        el.style.whiteSpace = "";
        if (muatSatuBaris) return;
        // Dua baris — font maksimum agar tinggi total ≤ 8.2% tinggi papan
        // (batas kartu putih), menyusut lagi bila teks lebih dari 2 baris.
        const w = el.closest(".pa-papan")?.clientWidth ?? parent.clientWidth;
        f = Math.min(base, (w / (2382 / 1684) * 0.082) / 2 / 1.12);
        el.style.fontSize = `${f}px`;
        while (f > base * 0.5 && el.scrollHeight > Math.ceil(f * 1.12 * 2) + 1) {
          f -= 0.25;
          el.style.fontSize = `${f}px`;
        }
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [value]);
  return (
    <span
      ref={ref}
      className={`overflow-hidden break-words leading-[1.12] line-clamp-2 ${className ?? ""}`}
    >
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

// chrome=false → tanpa tombol cetak & tanpa max-width: dipakai render
// tersembunyi untuk dikonversi jadi gambar (unduh massal di /admin/tagging).
export default function PapanTaging({
  order,
  chrome = true,
}: {
  order: ApiOrderRow;
  chrome?: boolean;
}) {
  // Label tampilan desa dari kelola lokasi — data_adopsi.desa menyimpan nama
  // internal satu kata (mis. "pondokparianlunang").
  const namaDesa = order.desaLabel || kapital(order.desa);
  // Nagari di Sumatera Barat, Desa di provinsi lain.
  const sebutan = sebutanDesa(order.provinsi);
  const subLokasi = [
    order.kecamatan.trim() && `Kec. ${kapital(order.kecamatan)}`,
    order.kabupaten.trim() && `Kab. ${kapital(order.kabupaten)}`,
    order.provinsi.trim() && `Provinsi ${kapital(order.provinsi)}`,
  ]
    .filter(Boolean)
    .join(", ");

  const baris: { label: string; nilai: string; italic?: boolean; memo?: boolean }[] = [
    { label: "ID", nilai: order.idpohon || "-" },
    { label: "Nama Pohon", nilai: order.localName || "-", italic: true },
    { label: "Diameter", nilai: `${order.diameter || 0} Cm` },
    { label: "Koordinat", nilai: `${order.lng ?? "-"}°, ${order.lat ?? "-"}°` },
    { label: "Berlaku Hingga", nilai: fmtBerlaku(order.tglExp) || "-" },
    { label: "Pesan & Impresi", nilai: order.memo.trim() || "-", italic: true, memo: true },
  ];

  return (
    <div>
      <div
        className={`pa-papan-wrap mx-auto w-full ${
          chrome ? "max-w-4xl overflow-hidden rounded-xl shadow-sm" : ""
        }`}
      >
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

          {/* Kepala: sebutan (Desa/Nagari) sejajar satu baris dengan nama
              desa, lalu kecamatan–provinsi di bawahnya. */}
          <div
            className="absolute inset-x-0 text-center leading-[1.1] font-bold text-[#161616]"
            style={{ top: "17.5%" }}
          >
            <div className="mx-auto max-w-[90%]">
              <FitText
                value={namaDesa ? `${sebutan} ${namaDesa}` : `${sebutan} -`}
                className="text-[3cqw]"
              />
            </div>
          </div>

          {subLokasi && (
            <div
              className="absolute inset-x-0 text-center leading-[1.1] font-bold text-[#161616]"
              style={{ top: "24.3%" }}
            >
              <div className="mx-auto max-w-[90%]">
                <FitText value={subLokasi} className="text-[2.7cqw]" />
              </div>
            </div>
          )}

          <div
            className="absolute inset-x-0 flex items-center justify-center leading-[1.1] font-black text-[#161616]"
            style={{ top: "30.5%", height: "12.9%" }}
          >
            <div className="max-w-[72%]">
              <FitText value={order.nama || "-"} className="text-[4.4cqw]" />
            </div>
          </div>

          {/* Enam baris detail dirapatkan (langkah 7%) agar baris Pesan &
              Impresi muat di dalam kartu putih. */}
          {baris.map((b, i) => (
            <div
              key={b.label}
              className="absolute left-0 flex w-full items-baseline leading-[1.1] font-bold text-[#161616]"
              style={{
                top: `${50.4 + 7 * i}%`,
                paddingLeft: "7.98%",
                fontFamily: '"Times New Roman", Times, serif',
              }}
            >
              <span className="w-[26%] shrink-0 whitespace-nowrap text-[3.2cqw]">
                {b.label}
              </span>
              <span className="text-[3.2cqw]">:&nbsp;&nbsp;</span>
              <span
                className={`min-w-0 ${i === 4 ? "max-w-[36%]" : i === 5 ? "max-w-[44%]" : "max-w-[50%]"}`}
              >
                {b.memo ? (
                  <MemoFit value={b.nilai} className={`text-[3.2cqw] ${b.italic ? "italic" : ""}`} />
                ) : (
                  <FitText value={b.nilai} className={`text-[3.2cqw] ${b.italic ? "italic" : ""}`} />
                )}
              </span>
            </div>
          ))}

          {/* QR kanan-bawah kartu (meniru papan fisik: ±86–93% kiri, lebar
              6.8% papan) — di kanan baris Pesan & Impresi. */}
          <div className="absolute" style={{ left: "86%", top: "83.5%", width: "6.8cqw" }}>
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

      {chrome && (
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
      )}
    </div>
  );
}
