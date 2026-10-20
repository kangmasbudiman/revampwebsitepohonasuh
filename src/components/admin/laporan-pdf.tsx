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

// Susun dokumen BTOR (Back To Office Report) dari data laporan — dipakai
// tombol unduh maupun pratinjau.
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
  y += 18;

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
  const rows: [string, string][] = [
    ["Nama", laporan.petugas || "-"],
    ["Jabatan", laporan.jabatan || "-"],
    ["Judul Kegiatan", laporan.judul],
    ["Jenis", laporan.jenis === "tagging" ? "Tagging Pohon" : laporan.jenis],
    ["Waktu Kegiatan", waktu],
    ["Tempat Kegiatan", laporan.tempat || laporan.desa || "-"],
    ["Rekening LPHN", rekening || "-"],
    ["Tim Tagging", (laporan.timTagging || "-").replace(/\n/g, ", ")],
  ];
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    const lines = doc.splitTextToSize(v, W - M * 2 - 130) as string[];
    doc.setFont("helvetica", "bold");
    doc.text(k, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(lines, M + 130, y);
    y += Math.max(lines.length, 1) * 14 + 4;
    if (y > 720) {
      doc.addPage();
      y = M;
    }
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Catatan Penting", M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const p of laporan.isi
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const lines = doc.splitTextToSize(p, W - M * 2) as string[];
    if (y + lines.length * 13 > 760) {
      doc.addPage();
      y = M;
    }
    doc.text(lines, M, y);
    y += lines.length * 13 + 6;
  }

  if (laporan.hasil.trim()) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Hasil / Manfaat Kegiatan", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(laporan.hasil, W - M * 2) as string[];
    doc.text(lines, M, y);
    y += lines.length * 13 + 6;
  }

  // Tanda tangan petugas di kanan bawah halaman terakhir.
  if (y > 620) {
    doc.addPage();
    y = M;
  }
  y = Math.max(y + 40, 640);
  doc.text(`Lunang, ${fmtTanggal(laporan.tanggalSelesai || laporan.tanggal)}`, W - M - 160, y);
  y += 46;
  doc.setFont("helvetica", "bold");
  doc.text(laporan.petugas || "-", W - M - 160, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(laporan.jabatan || "Petugas", W - M - 160, y);

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
