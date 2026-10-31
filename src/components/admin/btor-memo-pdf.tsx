"use client";

import { Download } from "lucide-react";
import type { ApiBtor, ApiBtorMemo } from "@/lib/api";

const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function terbilang(n: number): string {
  // Helper rekursif mengembalikan "" untuk 0 agar tidak muncul "nol" liar
  // di posisi tengah (mis. 2.750.000 → "dua juta tujuh ratus lima puluh ribu").
  const t = (x: number): string => {
    if (x === 0) return "";
    if (x < 12) return SATUAN[x];
    if (x < 20) return `${t(x - 10)} belas`;
    if (x < 100) return `${t(Math.floor(x / 10))} puluh ${t(x % 10)}`.trim();
    if (x < 200) return `seratus ${t(x - 100)}`.trim();
    if (x < 1000) return `${t(Math.floor(x / 100))} ratus ${t(x % 100)}`.trim();
    if (x < 2000) return `seribu ${t(x - 1000)}`.trim();
    if (x < 1_000_000) return `${t(Math.floor(x / 1000))} ribu ${t(x % 1000)}`.trim();
    if (x < 1_000_000_000)
      return `${t(Math.floor(x / 1_000_000))} juta ${t(x % 1_000_000)}`.trim();
    return `${t(Math.floor(x / 1_000_000_000))} miliar ${t(x % 1_000_000_000)}`.trim();
  };
  return t(n) || "nol";
}

export function fmtTanggal(s: string): string {
  if (!s) return "-";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// Logo untuk kop PDF: PNG asli 1040px/~437KB membengkakkan PDF jadi
// MB-an — turunkan skala ke 96px (cukup tajam untuk ikon kop 36pt).
export async function muatLogo(): Promise<string | null> {
  try {
    const res = await fetch("/images/logo_icon.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = dataUrl;
    });
    if (!img || !img.width) return null;
    const cv = document.createElement("canvas");
    cv.width = 96;
    cv.height = 96;
    const ctx = cv.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, 96, 96);
    return cv.toDataURL("image/png");
  } catch {
    return null;
  }
}

// Unduh Memo BTOR (format memorandum) sebagai PDF — dokumen dasar pencairan
// dana setelah BTOR diverifikasi. Kolom kosong memakai fallback dari data
// BTOR/keperluan.
export default function BtorMemoPdfButton({
  btor,
  memo,
}: {
  btor: ApiBtor;
  memo: ApiBtorMemo;
}) {
  const unduh = async () => {
    const [{ default: jsPDF }, logo] = await Promise.all([import("jspdf"), muatLogo()]);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48;
    let y = M;

    // Kop
    if (logo) doc.addImage(logo, "PNG", M, y - 14, 36, 36);
    const xKop = logo ? M + 44 : M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("POHON ASUH", xKop, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text("Memorandum Kegiatan", xKop, y + 14);
    doc.setDrawColor(30, 92, 63);
    doc.setLineWidth(2);
    doc.line(M, y + 24, W - M, y + 24);
    doc.setTextColor(20);
    y += 52;

    // Judul memorandum
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MEMORANDUM", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nomor: ${memo.nomor}`, M, y + 16);
    y += 40;

    const dari = memo.dari || btor.petugas;
    const kepada = memo.kepada || "Pohon Asuh";
    const proyek = memo.proyek || btor.judul;
    const info: [string, string][] = [
      ["Tanggal", fmtTanggal(memo.tanggal)],
      ["Dari", dari],
      ["Kepada", kepada],
      ["Proyek", proyek],
    ];
    for (const [k, v] of info) {
      const lines = doc.splitTextToSize(v, W - M * 2 - 90) as string[];
      doc.setFont("helvetica", "bold");
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, M + 90, y);
      y += Math.max(lines.length, 1) * 14 + 2;
    }

    y += 6;
    doc.setDrawColor(200);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 22;

    // Isi memorandum per paragraf
    const isi = memo.isi || memo.keperluan || "";
    if (isi) {
      for (const para of isi.split(/\n{2,}/)) {
        const teks = para.replace(/\n/g, " ").trim();
        if (!teks) continue;
        const lines = doc.splitTextToSize(teks, W - M * 2) as string[];
        if (y + lines.length * 14 > H - 60) {
          doc.addPage();
          y = M;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(lines, M, y);
        y += lines.length * 14 + 10;
      }
      y += 8;
    }

    // Blok pencairan dana
    if (y + 150 > H - 130) {
      doc.addPage();
      y = M;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PENCAIRAN DANA", M, y);
    y += 6;
    doc.setDrawColor(200);
    doc.setLineWidth(0.6);
    doc.line(M, y, M + 130, y);
    y += 16;

    const jumlahRp = `Rp ${memo.jumlah.toLocaleString("id-ID")}`;
    const rows: [string, string][] = [
      ["Jumlah Dana", `${jumlahRp} (${terbilang(Math.round(memo.jumlah))} rupiah)`],
      ["Penerima", memo.penerima],
      ["Rekening", [memo.bank, memo.norek].filter(Boolean).join(" · ") || "-"],
      ["Status Pencairan", memo.statusPencairan.toUpperCase()],
      ...(memo.catatanPencairan ? ([["Catatan", memo.catatanPencairan]] as [string, string][]) : []),
    ];
    for (const [k, v] of rows) {
      const lines = doc.splitTextToSize(v, W - M * 2 - 110) as string[];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, M + 110, y);
      y += Math.max(lines.length, 1) * 13 + 3;
    }

    // Tanda tangan dua kolom
    y = Math.max(y + 40, H - 150);
    doc.setFontSize(10);
    doc.text("Penerima Dana,", M, y);
    doc.text("Diterbitkan oleh,", W - M - 130, y);
    y += 56;
    doc.setFont("helvetica", "bold");
    doc.text(memo.penerima, M, y);
    doc.text(memo.ttdNama || dari, W - M - 130, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(memo.ttdJabatan || "", W - M - 130, y);

    doc.save(`${memo.nomor.replace(/\//g, "-")}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={unduh}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
      data-testid="unduh-memo-pdf"
    >
      <Download className="h-4 w-4" />
      Unduh Memo (PDF)
    </button>
  );
}
