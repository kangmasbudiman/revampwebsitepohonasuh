"use client";

import { Download } from "lucide-react";
import type { ApiBtorDetail } from "@/lib/api";
import { fmtTanggal, muatLogo } from "@/components/admin/btor-memo-pdf";

// Batas jumlah pohon pada lampiran foto (1 pohon = 1 foto) agar PDF ringkas.
const MAKS_POHON = 12;

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

// Foto order bisa berupa path upload di origin API (fetch lewat proxy
// same-origin) atau URL eksteral mis. Supabase (fetch langsung, CORS publik).
async function ambilBlob(url: string): Promise<Blob | null> {
  try {
    let res = await fetch(`/upload-proxy?url=${encodeURIComponent(url)}`);
    if (!res.ok) res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

async function muatFoto(url: string): Promise<FotoDoc | null> {
  try {
    const blob = await ambilBlob(url);
    if (!blob) return null;
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
    const [{ default: jsPDF }, logo, grupFoto] = await Promise.all([
      import("jspdf"),
      muatLogo(),
      (async () => {
        // 1 pohon 1 lampiran: cukup foto pertama tiap pohon, total dibatasi.
        const kandidat: { nama: string; url: string }[] = [];
        for (const o of btor.orders) {
          if (kandidat.length >= MAKS_POHON) break;
          const url = [
            ...new Map(o.foto.filter((f) => f.url).map((f) => [f.id, f.url])).values(),
          ][0];
          if (url) {
            kandidat.push({ nama: [o.idpohon, o.localname].filter(Boolean).join(" · "), url });
          }
        }
        const docs = await Promise.all(kandidat.map((k) => muatFoto(k.url)));
        return kandidat
          .map((k, i) => ({ nama: k.nama, doc: docs[i] }))
          .filter((g): g is { nama: string; doc: FotoDoc } => Boolean(g.doc));
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
    if (logo) doc.addImage(logo, "PNG", M, M - 16, 36, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("BACK TO OFFICE REPORT", logo ? M + 44 : M, M + 2);
    y = M + 24;
    garisH(M, W - M, y);
    ySeg = y;

    // Baris label|nilai pendek — baris utuh dipindah ke halaman baru bila tak
    // muat. Baseline pertama 15pt dari garis atas, garis bawah 8pt dari
    // baseline terakhir agar teks tidak menempel border.
    const barisRingkas = (label: string, nilai: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const ll = doc.splitTextToSize(label, LW - 16) as string[];
      doc.setFont("helvetica", "normal");
      const nl = nilai
        .split("\n")
        .flatMap((t) => doc.splitTextToSize(t, WNILAI) as string[]);
      const jml = Math.max(ll.length, nl.length);
      ruang(15 + (jml - 1) * 12 + 8);
      y += 15;
      let yl = y;
      doc.setFont("helvetica", "bold");
      for (const t of ll) {
        doc.text(t, M + 8, yl);
        yl += 12;
      }
      let yn = y;
      doc.setFont("helvetica", "normal");
      for (const t of nl) {
        doc.text(t, XNILAI, yn);
        yn += 12;
      }
      y += (jml - 1) * 12 + 8;
      garisH(M, W - M, y);
      sisi(ySeg, y);
      ySeg = y;
    };

    // Baris dengan nilai panjang (Catatan Penting / Foto) — nilai mulai di
    // baseline yang sama dengan label dan boleh bersambung antar halaman.
    const barisPanjang = (label: string, render: () => void) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const ll = doc.splitTextToSize(label, LW - 16) as string[];
      ruang(15 + ll.length * 12 + 8);
      y += 15;
      const yAwal = y;
      const halLabel = hal;
      let yl = y;
      for (const t of ll) {
        doc.text(t, M + 8, yl);
        yl += 12;
      }
      y = yAwal;
      render();
      if (hal === halLabel) y = Math.max(y, yl);
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
      if (grupFoto.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Foto dokumentasi tagging belum tersedia.", XNILAI, y);
        y += 12;
        return;
      }
      // grid 3 kolom: 1 pohon 1 foto, nama pohon sebagai caption tiap foto
      const kolom = 3;
      const celah = 8;
      const wSel = (WNILAI - celah * (kolom - 1)) / kolom;
      const hMaksSel = wSel * 1.3;
      for (let i = 0; i < grupFoto.length; i += kolom) {
        const sel = grupFoto.slice(i, i + kolom).map((g) => {
          let fw = wSel;
          let fh = (g.doc.h / g.doc.w) * fw;
          if (fh > hMaksSel) {
            fh = hMaksSel;
            fw = (g.doc.w / g.doc.h) * fh;
          }
          return { nama: g.nama, data: g.doc.data, fw, fh };
        });
        const tinggiBaris = Math.max(...sel.map((s) => s.fh));
        const captions = sel.map((s) =>
          (doc.splitTextToSize(s.nama || "Pohon", wSel) as string[]).slice(0, 2),
        );
        const capTinggi = Math.max(...captions.map((c) => c.length)) * 11;
        const terakhir = i + kolom >= grupFoto.length;
        // satu baris foto selalu utuh satu halaman bersama caption-nya
        ruang(tinggiBaris + capTinggi + celah + (terakhir ? 26 : 0));
        sel.forEach((s, j) => {
          doc.addImage(
            s.data,
            "JPEG",
            XNILAI + j * (wSel + celah) + (wSel - s.fw) / 2,
            y,
            s.fw,
            s.fh,
          );
        });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        sel.forEach((s, j) => {
          let ycl = y + tinggiBaris + 10;
          for (const t of captions[j]) {
            doc.text(t, XNILAI + j * (wSel + celah) + wSel / 2, ycl, { align: "center" });
            ycl += 11;
          }
        });
        y += tinggiBaris + capTinggi + celah;
      }
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
