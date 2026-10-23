"use client";

import { Download } from "lucide-react";
import type { ApiBtorDetail } from "@/lib/api";
import { fmtTanggal } from "@/components/admin/btor-memo-pdf";

// Batas foto dokumentasi per laporan agar PDF tetap ringkas (template asli
// hanya menyertakan foto pilihan, bukan seluruh foto per pohon).
const MAKS_FOTO = 12;

// Paragraf berawalan tanggal (08 April 2026 / 2026-04-08 / 08-04) menjadi
// heading bold per hari — pola sama dengan timeline halaman detail BTOR.
const POLA_TANGGAL =
  /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/;

function parseHari(isi: string): { judul: string; teks: string }[] {
  const baris = isi
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const node: { judul: string; teks: string }[] = [];
  let cur: { judul: string; teks: string } | null = null;
  for (const b of baris) {
    if (POLA_TANGGAL.test(b) && b.length <= 40) {
      if (cur) node.push(cur);
      cur = { judul: b, teks: "" };
    } else if (cur) {
      cur.teks = cur.teks ? `${cur.teks}\n${b}` : b;
    } else {
      cur = { judul: "", teks: b };
    }
  }
  if (cur) node.push(cur);
  return node;
}

type FotoDoc = { data: string; w: number; h: number };

// Foto order dihost di origin API — fetch lewat proxy same-origin lalu
// konversi ke dataURL JPEG (canvas) agar bisa dilekatkan ke jsPDF.
async function muatFoto(url: string): Promise<FotoDoc | null> {
  try {
    const res = await fetch(`/upload-proxy?url=${encodeURIComponent(url)}`);
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
    if (!img || !img.width || !img.height) return null;
    const skala = Math.min(1, 1100 / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.width * skala));
    cv.height = Math.max(1, Math.round(img.height * skala));
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return { data: cv.toDataURL("image/jpeg", 0.85), w: cv.width, h: cv.height };
  } catch {
    return null;
  }
}

// Unduh Laporan BTOR (PDF) mengikuti format resmi "BACK TO OFFICE REPORT":
// satu tabel dua kolom berbatas hitam tipis (label bold | nilai) berisi identitas
// kegiatan, Catatan Penting per hari, dan foto dokumentasi tagging.
export default function BtorLaporanPdfButton({ btor }: { btor: ApiBtorDetail }) {
  const unduh = async () => {
    const [{ default: jsPDF }, fotoDocs] = await Promise.all([
      import("jspdf"),
      (async () => {
        const url: string[] = [];
        const sudah = new Set<number>();
        for (const o of btor.orders) {
          for (const f of o.foto) {
            if (f.url && !sudah.has(f.id)) {
              sudah.add(f.id);
              url.push(f.url);
            }
          }
        }
        const dimuat = await Promise.all(url.slice(0, MAKS_FOTO).map(muatFoto));
        return dimuat.filter((d): d is FotoDoc => Boolean(d));
      })(),
    ]);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 46;
    const LW = Math.round((W - M * 2) * 0.28);
    const XNILAI = M + LW + 8;
    const WNILAI = W - M - XNILAI - 8;
    const BOT = H - 48;
    const TEPI = 0.5;

    let hal = 1;
    let y = M;
    let ySeg = M;
    const vertikal: { hal: number; x: number; y1: number; y2: number }[] = [];

    const garisH = (x1: number, x2: number, yy: number) => {
      doc.setDrawColor(0);
      doc.setLineWidth(TEPI);
      doc.line(x1, yy, x2, yy);
    };
    const sisi = (y1: number, y2: number) => {
      for (const x of [M, M + LW, W - M]) vertikal.push({ hal, x, y1, y2 });
    };
    const pindahHalaman = () => {
      sisi(ySeg, y);
      doc.addPage();
      hal += 1;
      y = M;
      ySeg = M;
    };
    const ruang = (butuh: number) => {
      if (y + butuh > BOT) pindahHalaman();
    };

    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("BACK TO OFFICE REPORT", M, M + 2);
    y = M + 18;
    garisH(M, W - M, y);
    ySeg = y;

    // Baris label|nilai pendek — baris utuh dipindah ke halaman baru bila tak muat.
    const barisRingkas = (label: string, nilai: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const ll = doc.splitTextToSize(label, LW - 12) as string[];
      doc.setFont("helvetica", "normal");
      const nl = nilai
        .split("\n")
        .flatMap((t) => doc.splitTextToSize(t, WNILAI) as string[]);
      const isi = Math.max(ll.length, nl.length) * 12;
      ruang(isi + 16);
      y += 8;
      let yl = y;
      doc.setFont("helvetica", "bold");
      for (const t of ll) {
        doc.text(t, M + 6, yl);
        yl += 12;
      }
      let yn = y;
      doc.setFont("helvetica", "normal");
      for (const t of nl) {
        doc.text(t, XNILAI, yn);
        yn += 12;
      }
      y += isi + 8;
      garisH(M, W - M, y);
      sisi(ySeg, y);
      ySeg = y;
    };

    // Baris dengan nilai panjang (Catatan Penting / Foto) — nilai boleh
    // terpotong bersambung ke halaman berikutnya.
    const barisPanjang = (label: string, render: () => void) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const ll = doc.splitTextToSize(label, LW - 12) as string[];
      ruang(ll.length * 12 + 24);
      y += 8;
      for (const t of ll) {
        doc.text(t, M + 6, y);
        y += 12;
      }
      render();
      y += 8;
      garisH(M, W - M, y);
      sisi(ySeg, y);
      ySeg = y;
    };

    const paragraf = (teks: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(teks.replace(/\s+/g, " ").trim(), WNILAI) as string[];
      for (const ln of lines) {
        ruang(12);
        doc.text(ln, XNILAI, y);
        y += 12;
      }
      y += 6;
    };

    const waktu =
      btor.tanggalSelesai && btor.tanggalSelesai !== btor.tanggal
        ? `${fmtTanggal(btor.tanggal)} - ${fmtTanggal(btor.tanggalSelesai)}`
        : fmtTanggal(btor.tanggal);
    const rekening = [
      [
        btor.rekeningBank ? `Rekening ${btor.rekeningBank}` : "",
        btor.rekeningAt ? `a.n. ${btor.rekeningAt}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      btor.rekeningNorek,
    ]
      .filter(Boolean)
      .join("\n");

    barisRingkas("Nama", btor.timTagging || btor.petugas);
    barisRingkas("Jabatan", btor.jabatan || "-");
    barisRingkas("Judul Kegiatan", btor.judul);
    barisRingkas("Waktu Kegiatan", waktu);
    barisRingkas("Tempat Kegiatan", btor.desa);
    barisRingkas("Rekening", rekening || "-");

    barisPanjang("Catatan Penting", () => {
      for (const n of parseHari(btor.isi)) {
        if (n.judul) {
          ruang(26);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(n.judul, XNILAI, y);
          y += 14;
        }
        for (const p of n.teks.split("\n")) paragraf(p);
        y += 4;
      }
      if (btor.hasil.trim()) {
        ruang(30);
        y += 6;
        for (const p of btor.hasil.split(/\n{2,}/)) paragraf(p);
      }
    });

    barisPanjang("Foto", () => {
      if (fotoDocs.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Foto dokumentasi tagging belum tersedia.", XNILAI, y);
        y += 12;
        return;
      }
      const hMaks = BOT - M - 20;
      for (let i = 0; i < fotoDocs.length; i++) {
        const f = fotoDocs[i];
        let fw = WNILAI;
        let fh = (f.h / f.w) * fw;
        if (fh > hMaks) {
          fh = hMaks;
          fw = (f.w / f.h) * fh;
        }
        // foto terakhir selalu satu halaman dengan caption-nya
        ruang(fh + 12 + (i === fotoDocs.length - 1 ? 30 : 0));
        doc.addImage(f.data, "JPEG", XNILAI + (WNILAI - fw) / 2, y, fw, fh);
        y += fh + 10;
      }
      ruang(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        "Dokumentasi proses tagging pohon asuh",
        XNILAI + WNILAI / 2,
        y + 8,
        { align: "center" },
      );
      y += 12;
    });

    // Garis vertikal tabel digambar belakangan per halaman (baris bisa
    // bersambung antar halaman).
    doc.setDrawColor(0);
    doc.setLineWidth(TEPI);
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      for (const s of vertikal) {
        if (s.hal === p) doc.line(s.x, s.y1, s.x, s.y2);
      }
    }

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
