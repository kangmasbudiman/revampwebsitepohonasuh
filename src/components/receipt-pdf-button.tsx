"use client";

import { Download } from "lucide-react";
import type { ApiAdopsiPohon, ApiConfirmation } from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";
import { fmtTanggal, muatLogo } from "@/components/admin/btor-memo-pdf";

export type ReceiptLabels = {
  button: string;
  title: string;
  paid: string;
  invoiceNo: string;
  donor: string;
  orderDate: string;
  status: string;
  no: string;
  code: string;
  species: string;
  village: string;
  duration: string;
  fee: string;
  subtotal: string;
  uniqueCode: string;
  totalPaid: string;
  printedAt: string;
  footerNote: string;
  year: string;
  years: string;
};

// Unduh Receipt (PDF) untuk order yang sudah terverifikasi lunas —
// generate client-side dengan jsPDF, pola tombol BTOR admin.
export default function ReceiptPdfButton({
  conf,
  trees,
  name,
  t,
  compact,
}: {
  conf: ApiConfirmation;
  trees: ApiAdopsiPohon[];
  name: string;
  t: ReceiptLabels;
  compact?: boolean;
}) {
  const unduh = async () => {
    const [{ default: jsPDF }, logo] = await Promise.all([import("jspdf"), muatLogo()]);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 46;
    const EMERALD: [number, number, number] = [5, 150, 105];
    const ABU: [number, number, number] = [110, 110, 110];

    let y = M;
    if (logo) doc.addImage(logo, "PNG", M, y - 4, 34, 34);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("POHON ASUH", M + 44, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ABU);
    doc.text("pohonasuh.io", M + 44, y + 22);
    y += 40;
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 34;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(0);
    doc.text(t.title.toUpperCase(), W / 2, y, { align: "center" });
    y += 16;
    // Badge LUNAS terpusat di bawah judul
    doc.setFontSize(9);
    const bw = doc.getTextWidth(t.paid) + 22;
    doc.setFillColor(...EMERALD);
    doc.roundedRect(W / 2 - bw / 2, y - 10, bw, 16, 8, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(t.paid, W / 2, y + 1, { align: "center" });
    doc.setTextColor(0);
    y += 30;

    // Blok info 2 kolom: label kecil abu di atas nilai.
    const info = (x: number, label: string, value: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...ABU);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(value, x, y + 14);
    };
    info(M, t.invoiceNo, conf.invoice);
    info(W / 2 + 10, t.orderDate, fmtTanggal(conf.tanggal));
    y += 34;
    info(M, t.donor, name);
    info(W / 2 + 10, t.status, t.paid);
    y += 34;

    // Tabel pohon: header berlatar emerald muda, garis grid tipis.
    const kolX = [M, M + 26, M + 96, M + 252, M + 350, W - M];
    const kolJus = ["left", "left", "left", "left", "left", "right"] as const;
    const header = [t.no, t.code, t.species, t.village, t.duration, t.fee];
    const tinggiBaris = 24;

    const headerTabel = (yy: number) => {
      doc.setFillColor(228, 244, 236);
      doc.rect(M, yy, W - M * 2, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0);
      header.forEach((h, i) =>
        doc.text(h, kolJus[i] === "right" ? kolX[i] : kolX[i] + 4, yy + 15, {
          align: kolJus[i],
        }),
      );
      return yy + 22;
    };

    y = headerTabel(y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    trees.forEach((tr, i) => {
      if (y + tinggiBaris > H - 150) {
        doc.setDrawColor(...ABU);
        doc.setLineWidth(0.5);
        doc.line(M, y, W - M, y);
        doc.addPage();
        y = headerTabel(M);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
      }
      const baris = [
        String(i + 1),
        tr.idpohon,
        tr.localName,
        namaDesa(tr.desa),
        `${tr.dur} ${tr.dur === 1 ? t.year : t.years}`,
        rupiah(tr.price),
      ];
      // Nama pohon/desa panjang dipotong ke lebar kolomnya
      const lebarKol = kolX.slice(1).map((x, j) => x - kolX[j] - 8);
      baris.forEach((v, c) => {
        const potong = (doc.splitTextToSize(v, lebarKol[c] ?? 60) as string[])[0] ?? v;
        doc.text(
          potong,
          kolJus[c] === "right" ? kolX[c] : kolX[c] + 4,
          y + 16,
          { align: kolJus[c] },
        );
      });
      y += tinggiBaris;
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.5);
      doc.line(M, y, W - M, y);
    });
    // Garis vertikal tabel
    doc.setDrawColor(190, 190, 190);
    for (const x of kolX) doc.line(x, y - trees.length * tinggiBaris, x, y);

    // Ringkasan biaya di kanan bawah tabel
    const subtotal = trees.reduce((s, tr) => s + tr.price, 0);
    const unik = Math.max(0, conf.price - subtotal);
    y += 24;
    const ringX = W - M - 220;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(t.subtotal, ringX, y);
    doc.text(rupiah(subtotal), W - M, y, { align: "right" });
    y += 16;
    doc.text(t.uniqueCode, ringX, y);
    doc.text(rupiah(unik), W - M, y, { align: "right" });
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(t.totalPaid, ringX, y);
    doc.text(rupiah(conf.price), W - M, y, { align: "right" });
    doc.setLineWidth(0.75);
    doc.line(ringX - 8, y + 6, W - M, y + 6);

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ABU);
    doc.text(t.footerNote, M, H - 52, { maxWidth: W - M * 2 });
    doc.text(
      `${t.printedAt}: ${new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`,
      M,
      H - 36,
    );

    doc.save(`Receipt-${conf.invoice.replace(/^#/, "")}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={unduh}
      data-testid="unduh-receipt"
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          : "inline-flex items-center gap-2 rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
      }
    >
      <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {t.button}
    </button>
  );
}
