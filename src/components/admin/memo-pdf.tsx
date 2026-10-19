"use client";

import { Download } from "lucide-react";
import type { ApiLaporan, ApiLaporanMemo } from "@/lib/api";

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
  if (n < 12) return SATUAN[n] || "nol";
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh ${terbilang(n % 10)}`.trim();
  if (n < 200) return `seratus ${terbilang(n - 100)}`.trim();
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus ${terbilang(n % 100)}`.trim();
  if (n < 2000) return `seribu ${terbilang(n - 1000)}`.trim();
  if (n < 1_000_000) return `${terbilang(Math.floor(n / 1000))} ribu ${terbilang(n % 1000)}`.trim();
  if (n < 1_000_000_000)
    return `${terbilang(Math.floor(n / 1_000_000))} juta ${terbilang(n % 1_000_000)}`.trim();
  return `${terbilang(Math.floor(n / 1_000_000_000))} miliar ${terbilang(n % 1_000_000_000)}`.trim();
}

function fmtTanggal(s: string): string {
  if (!s) return "-";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// Unduh Memo Pencairan sebagai PDF — dokumen resmi dasar pencairan dana
// kegiatan setelah BTOR diverifikasi.
export default function MemoPdfButton({
  laporan,
  memo,
}: {
  laporan: ApiLaporan;
  memo: ApiLaporanMemo;
}) {
  const unduh = async () => {
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
    doc.text("Memo Pencairan Dana Kegiatan", M, y + 14);
    doc.setDrawColor(30, 92, 63);
    doc.setLineWidth(2);
    doc.line(M, y + 24, W - M, y + 24);
    doc.setTextColor(20);
    y += 56;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MEMO PENCAIRAN DANA", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nomor: ${memo.nomor}`, M, y + 16);
    y += 40;

    const jumlahRp = `Rp ${memo.jumlah.toLocaleString("id-ID")}`;
    const rows: [string, string][] = [
      ["Tanggal", fmtTanggal(memo.tanggal)],
      ["Kegiatan", laporan.judul],
      ["Petugas / Pengelola", `${laporan.petugas}${laporan.jabatan ? ` (${laporan.jabatan})` : ""}`],
      ["Jumlah Dana", `${jumlahRp} (${terbilang(Math.round(memo.jumlah))} rupiah)`],
      ["Penerima", memo.penerima],
      ["Rekening", [memo.bank, memo.norek].filter(Boolean).join(" · ") || "-"],
      ["Keperluan", memo.keperluan || "-"],
      ["Status Pencairan", memo.statusPencairan.toUpperCase()],
      ...(memo.catatanPencairan ? ([["Catatan", memo.catatanPencairan]] as [string, string][]) : []),
    ];
    for (const [k, v] of rows) {
      const lines = doc.splitTextToSize(v, W - M * 2 - 140) as string[];
      doc.setFont("helvetica", "bold");
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, M + 140, y);
      y += Math.max(lines.length, 1) * 14 + 4;
    }

    y = Math.max(y + 50, 560);
    doc.text("Penerima Dana,", M, y);
    doc.text(`Diterbitkan oleh,`, W - M - 140, y);
    y += 56;
    doc.setFont("helvetica", "bold");
    doc.text(memo.penerima, M, y);
    doc.text(memo.ttdNama || "-", W - M - 140, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(memo.ttdJabatan || "", W - M - 140, y);

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
