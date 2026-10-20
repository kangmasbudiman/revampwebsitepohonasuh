"use client";

import { Download, Eye } from "lucide-react";
import type { jsPDF } from "jspdf";
import type { ApiLaporan } from "@/lib/api";

function fmtTanggal(s: string): string {
  if (!s) return "-";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// Muat byte foto lewat proxy same-origin (hindari blokir CORS /upload/*),
// dekode dengan createImageBitmap lalu konversi ke JPEG data URL agar bisa
// di-embed jspdf dan ukurannya terkendali. Null bila gagal → placeholder.
async function muatFotoJpeg(url: string): Promise<{ data: string; rasio: number } | null> {
  try {
    const res = await fetch(`/upload-proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const skala = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * skala));
    const h = Math.max(1, Math.round(bmp.height * skala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return null;
    }
    ctx.fillStyle = "#ffffff"; // ratakan latar transparan (PNG) sebelum JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return { data: canvas.toDataURL("image/jpeg", 0.82), rasio: w / h };
  } catch {
    return null;
  }
}

// Paragraf catatan per hari: heading tanggal di awal paragraf ("08 April:")
// digambar bold inline, sisanya normal — mengikuti lembar BTOR asli.
type Paragraf = { prefix?: string; text: string };

function paragrafCatatan(isi: string): Paragraf[] {
  const paras = isi
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map<Paragraf>((p) => {
      const m = p.match(/^(\d{1,2}[ ./-][A-Za-z]+|\d{4}-\d{2}-\d{2})\s*[:-]\s*/);
      return m ? { prefix: m[0].trim(), text: p.slice(m[0].length) } : { text: p };
    });
  return paras.length ? paras : [{ text: "-" }];
}

type BarisTabel = { label: string; paras: Paragraf[] };

// Susun dokumen BTOR (Back To Office Report) dari data laporan — dipakai
// tombol unduh maupun pratinjau. Identitas kegiatan dalam tabel bertepi
// garis, disusul lampiran foto dokumentasi di halaman berikutnya.
export async function buatBtorPdf(laporan: ApiLaporan): Promise<jsPDF> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("POHON ASUH", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Laporan Kegiatan Petugas Tagging", M, y + 14);
  doc.setDrawColor(30, 92, 63);
  doc.setLineWidth(2);
  doc.line(M, y + 24, W - M, y + 24);
  doc.setTextColor(20);
  y += 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("BACK TO OFFICE REPORT", M, y);
  y += 10;
  doc.setDrawColor(200);
  doc.setLineWidth(0.6);
  doc.line(M, y, M + 220, y);
  y += 22;

  const waktu =
    laporan.tanggalSelesai && laporan.tanggalSelesai !== laporan.tanggal
      ? `${fmtTanggal(laporan.tanggal)} — ${fmtTanggal(laporan.tanggalSelesai)}`
      : fmtTanggal(laporan.tanggal);
  const rekening = [
    laporan.rekeningAt && `a.n. ${laporan.rekeningAt}`,
    laporan.rekeningBank,
    laporan.rekeningNorek,
  ]
    .filter(Boolean)
    .join(" · ");
  const rows: BarisTabel[] = [
    { label: "Nama", paras: [{ text: laporan.petugas || "-" }] },
    { label: "Jabatan", paras: [{ text: laporan.jabatan || "-" }] },
    { label: "Judul Kegiatan", paras: [{ text: laporan.judul }] },
    { label: "Waktu Kegiatan", paras: [{ text: waktu }] },
    { label: "Tempat Kegiatan", paras: [{ text: laporan.tempat || laporan.desa || "-" }] },
    { label: "Rekening LPHN", paras: [{ text: rekening || "-" }] },
    {
      label: "Tim Tagging",
      paras: [{ text: (laporan.timTagging || "-").replace(/\n/g, ", ") }],
    },
    { label: "Catatan Penting", paras: paragrafCatatan(laporan.isi) },
  ];
  if (laporan.hasil.trim()) {
    rows.push({ label: "Hasil / Manfaat", paras: [{ text: laporan.hasil }] });
  }

  const labelW = 118;
  const valueW = W - M * 2 - labelW;
  const xV = M + labelW + 8;
  const LH = 13;

  const ukurParas = (paras: Paragraf[]): number => {
    let tinggi = 0;
    for (const p of paras) {
      let prefixW = 0;
      if (p.prefix) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        prefixW = doc.getTextWidth(`${p.prefix} `);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(p.text || " ", valueW - 14 - prefixW) as string[];
      tinggi += lines.length * LH + 5;
    }
    return Math.max(tinggi - 5, LH);
  };

  const gambarParas = (paras: Paragraf[], yStart: number): number => {
    let ty = yStart;
    for (const p of paras) {
      let prefixW = 0;
      if (p.prefix) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        prefixW = doc.getTextWidth(`${p.prefix} `);
        doc.text(p.prefix, xV, ty);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(p.text || " ", valueW - 14 - prefixW) as string[];
      doc.text(lines[0] ?? "", xV + prefixW, ty);
      if (lines.length > 1) doc.text(lines.slice(1), xV, ty + LH);
      ty += lines.length * LH + 5;
    }
    return ty - 5;
  };

  doc.setDrawColor(120);
  doc.setLineWidth(0.6);
  for (const row of rows) {
    const rowH = ukurParas(row.paras) + 10;
    if (y + rowH > 780) {
      doc.addPage();
      y = M;
    }
    doc.rect(M, y, labelW, rowH);
    doc.rect(M + labelW, y, valueW, rowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(row.label, M + 8, y + 15);
    gambarParas(row.paras, y + 15);
    y += rowH;
  }

  // Tanda tangan petugas di kanan bawah.
  if (y > 620) {
    doc.addPage();
    y = M;
  }
  y = Math.max(y + 40, 640);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Lunang, ${fmtTanggal(laporan.tanggalSelesai || laporan.tanggal)}`, W - M - 160, y);
  y += 46;
  doc.setFont("helvetica", "bold");
  doc.text(laporan.petugas || "-", W - M - 160, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(laporan.jabatan || "Petugas", W - M - 160, y);

  // Lampiran foto dokumentasi — grid 2 kolom per halaman.
  const fotoUrl = (laporan.foto ?? []).map((f) => f.url).filter(Boolean);
  if (fotoUrl.length > 0) {
    const termuat = await Promise.all(fotoUrl.map((u) => muatFotoJpeg(u)));
    doc.addPage();
    y = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text("LAMPIRAN FOTO", M, y + 8);
    doc.setDrawColor(30, 92, 63);
    doc.setLineWidth(1.5);
    doc.line(M, y + 16, W - M, y + 16);
    y += 36;
    const gap = 16;
    const cw = (W - M * 2 - gap) / 2;
    const ch = 165;
    let kolom = 0;
    for (let i = 0; i < termuat.length; i++) {
      if (kolom === 0 && y + ch + 24 > 790) {
        doc.addPage();
        y = M;
      }
      const x = M + kolom * (cw + gap);
      const f = termuat[i];
      if (f) {
        let iw = cw;
        let ih = cw / f.rasio;
        if (ih > ch) {
          ih = ch;
          iw = ch * f.rasio;
        }
        doc.addImage(f.data, "JPEG", x + (cw - iw) / 2, y, iw, ih);
      } else {
        doc.setDrawColor(200);
        doc.setLineWidth(0.6);
        doc.rect(x, y, cw, ch);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(130);
        doc.text("Gagal memuat foto", x + cw / 2, y + ch / 2, { align: "center" });
        doc.setTextColor(20);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      doc.text(`Foto ${i + 1}`, x, y + ch + 13);
      doc.setTextColor(20);
      if (kolom === 1) y += ch + 28;
      kolom = kolom === 1 ? 0 : 1;
    }
  }

  return doc;
}

function namaFileBtor(laporan: ApiLaporan): string {
  return `btor-${laporan.id}-${(laporan.judul || "laporan").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pdf`;
}

// Unduh Laporan (BTOR) sebagai PDF, format mengikuti lembar BTOR lapangan.
export default function LaporanPdfButton({ laporan }: { laporan: ApiLaporan }) {
  const unduh = async () => {
    const doc = await buatBtorPdf(laporan);
    doc.save(namaFileBtor(laporan));
  };

  return (
    <button
      type="button"
      onClick={unduh}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
      data-testid="unduh-laporan-pdf"
    >
      <Download className="h-4 w-4" />
      Unduh Laporan (PDF)
    </button>
  );
}

// Pratinjau BTOR: buka PDF di tab baru browser (tetap bisa print/save dari
// viewer bawaan) tanpa perlu mengunduh berkas dulu.
export function LihatBtorButton({
  laporan,
  className,
  label = "Lihat BTOR",
  title,
}: {
  laporan: ApiLaporan;
  className?: string;
  label?: string;
  title?: string;
}) {
  const lihat = async () => {
    const doc = await buatBtorPdf(laporan);
    const url = doc.output("bloburl");
    const tab = window.open(url, "_blank");
    if (!tab) {
      // Popup diblokir — buka lewat tautan agar tetap diizinkan browser.
      const a = document.createElement("a");
      a.href = url.toString();
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    }
  };

  return (
    <button
      type="button"
      onClick={lihat}
      title={title ?? "Buka dokumen BTOR (PDF) di tab baru"}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
      }
      data-testid="lihat-btor"
    >
      <Eye className="h-4 w-4" />
      {label}
    </button>
  );
}
