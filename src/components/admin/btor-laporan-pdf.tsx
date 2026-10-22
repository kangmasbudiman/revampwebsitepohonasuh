"use client";

import { Download } from "lucide-react";
import type { ApiBtorDetail } from "@/lib/api";
import { fmtTanggal, muatLogo } from "@/components/admin/btor-memo-pdf";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  terkirim: "Terkirim",
  revisi: "Perlu Revisi",
  disetujui: "Disetujui",
};

// Unduh Laporan BTOR (laporan kegiatan tagging) sebagai PDF — rekap judul,
// petugas/desa, catatan kegiatan, hasil, dan daftar order tagging.
export default function BtorLaporanPdfButton({ btor }: { btor: ApiBtorDetail }) {
  const unduh = async () => {
    const [{ default: jsPDF }, logo] = await Promise.all([import("jspdf"), muatLogo()]);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48;
    let y = M;

    const pastikanRuang = (butuh: number) => {
      if (y + butuh > H - 60) {
        doc.addPage();
        y = M;
      }
    };

    // Kop
    if (logo) doc.addImage(logo, "PNG", M, y - 14, 36, 36);
    const xKop = logo ? M + 44 : M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("POHON ASUH", xKop, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text("Laporan Kegiatan Tagging (BTOR)", xKop, y + 14);
    doc.setDrawColor(30, 92, 63);
    doc.setLineWidth(2);
    doc.line(M, y + 24, W - M, y + 24);
    doc.setTextColor(20);
    y += 52;

    // Judul laporan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("LAPORAN KEGIATAN TAGGING", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nomor: BTOR/${btor.id}`, M, y + 16);
    y += 40;

    const waktu =
      btor.tanggalSelesai && btor.tanggalSelesai !== btor.tanggal
        ? `${fmtTanggal(btor.tanggal)} — ${fmtTanggal(btor.tanggalSelesai)}`
        : fmtTanggal(btor.tanggal);
    const info: [string, string][] = [
      ["Judul", btor.judul],
      ["Petugas", btor.jabatan ? `${btor.petugas} (${btor.jabatan})` : btor.petugas],
      ["Desa", btor.desa],
      ["Waktu Kegiatan", waktu],
      ["Tim Tagging", btor.timTagging || "-"],
      ["Status", STATUS_LABEL[btor.status] ?? btor.status],
    ];
    for (const [k, v] of info) {
      const lines = doc.splitTextToSize(v, W - M * 2 - 90) as string[];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, M + 90, y);
      y += Math.max(lines.length, 1) * 13 + 3;
    }

    y += 4;
    doc.setDrawColor(200);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 22;

    // Catatan kegiatan per paragraf
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CATATAN KEGIATAN", M, y);
    y += 6;
    doc.setDrawColor(200);
    doc.line(M, y, M + 130, y);
    y += 16;
    for (const para of btor.isi.split(/\n{2,}/)) {
      const teks = para.replace(/\n/g, " ").trim();
      if (!teks) continue;
      const lines = doc.splitTextToSize(teks, W - M * 2) as string[];
      pastikanRuang(lines.length * 14 + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(lines, M, y);
      y += lines.length * 14 + 8;
    }

    // Hasil / manfaat
    if (btor.hasil.trim()) {
      pastikanRuang(60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("HASIL / MANFAAT", M, y);
      y += 6;
      doc.setDrawColor(200);
      doc.line(M, y, M + 110, y);
      y += 16;
      for (const para of btor.hasil.split(/\n{2,}/)) {
        const teks = para.replace(/\n/g, " ").trim();
        if (!teks) continue;
        const lines = doc.splitTextToSize(teks, W - M * 2) as string[];
        pastikanRuang(lines.length * 14 + 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(lines, M, y);
        y += lines.length * 14 + 8;
      }
    }

    // Rekap dana & rekening
    const rekening = [btor.rekeningBank, btor.rekeningNorek, btor.rekeningAt && `a.n. ${btor.rekeningAt}`]
      .filter(Boolean)
      .join(" · ");
    pastikanRuang(70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("REKAP DANA", M, y);
    y += 6;
    doc.setDrawColor(200);
    doc.line(M, y, M + 90, y);
    y += 16;
    const dana: [string, string][] = [
      ["Nilai Order", btor.orders.length > 0 ? btor.orders.reduce((s, o) => s + o.price, 0).toLocaleString("id-ID") : "0"],
      ["Dana Digunakan", btor.dana !== null ? btor.dana.toLocaleString("id-ID") : "-"],
      ["Rekening Pencairan", rekening || "-"],
    ];
    for (const [k, v] of dana) {
      const lines = doc.splitTextToSize(v, W - M * 2 - 110) as string[];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, M + 110, y);
      y += Math.max(lines.length, 1) * 13 + 3;
    }
    y += 12;

    // Daftar order tagging
    if (btor.orders.length > 0) {
      pastikanRuang(50 + btor.orders.length * 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`DAFTAR ORDER TAGGING (${btor.orders.length})`, M, y);
      y += 6;
      doc.setDrawColor(200);
      doc.line(M, y, M + 170, y);
      y += 14;
      const kolomHarga = W - M - 90;
      doc.setFontSize(8.5);
      doc.text("Invoice", M, y);
      doc.text("Pohon", M + 90, y);
      doc.text("Donatur", M + 175, y);
      doc.text("Harga (Rp)", W - M, y, { align: "right" });
      y += 4;
      doc.line(M, y, W - M, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      for (const o of btor.orders) {
        pastikanRuang(16);
        const donatur = doc.splitTextToSize(o.donatur || "-", kolomHarga - M - 185) as string[];
        const pohon = doc.splitTextToSize(`${o.idpohon} · ${o.localname}`, 85) as string[];
        doc.text(String(o.invoice).slice(0, 16), M, y);
        doc.text(pohon[0] ?? "", M + 90, y);
        doc.text(donatur[0] ?? "", M + 175, y);
        doc.text(o.price.toLocaleString("id-ID"), W - M, y, { align: "right" });
        y += 14;
      }
      y += 8;
    }

    // Tanda tangan dua kolom
    pastikanRuang(140);
    y = Math.max(y + 30, H - 150);
    doc.setFontSize(10);
    doc.text("Petugas,", M, y);
    doc.text("Mengetahui,", W - M - 110, y);
    y += 56;
    doc.setFont("helvetica", "bold");
    doc.text(btor.petugas, M, y);
    doc.text("Admin Pohon Asuh", W - M - 110, y);

    const slug = btor.judul
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    doc.save(`BTOR-${btor.id}${slug ? `-${slug}` : ""}.pdf`);
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
