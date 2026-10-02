"use client";

import { useState } from "react";
import { Download, FileJson, Map as MapIcon, FileText } from "lucide-react";
import type { ApiPetaPohon, TreeStatus } from "@/lib/api";

const STATUS_LABEL: Record<TreeStatus, string> = {
  AVAILABLE: "Tersedia",
  RESERVED: "Dipesan",
  ADOPTED: "Teradopsi",
};

// KML memakai aabbggrr.
const KML_COLOR: Record<TreeStatus, string> = {
  AVAILABLE: "ff10b981",
  RESERVED: "fff59e0b",
  ADOPTED: "ff71717a",
};

function slug(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "desa";
}

function unduhBlob(nama: string, isi: string, tipe: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  URL.revokeObjectURL(url);
}

function unduhGeoJSON(desa: string, pohon: ApiPetaPohon[]) {
  const fc = {
    type: "FeatureCollection",
    name: `Peta ${desa}`,
    features: pohon
      .filter((p) => p.lat !== null && p.lng !== null)
      .map((p) => ({
        type: "Feature",
        properties: {
          idpohon: p.code,
          localname: p.localName,
          species: p.species ?? "",
          status: STATUS_LABEL[p.status],
        },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
  };
  unduhBlob(`peta-${slug(desa)}.geojson`, JSON.stringify(fc, null, 2), "application/geo+json");
}

function unduhKML(desa: string, pohon: ApiPetaPohon[]) {
  const titik = pohon.filter((p) => p.lat !== null && p.lng !== null);
  const placemarks = titik
    .map(
      (p) => `    <Placemark>
      <name>${p.code}</name>
      <description><![CDATA[${p.localName}${p.species ? ` — ${p.species}` : ""} · ${STATUS_LABEL[p.status]}]]></description>
      <styleUrl>#${p.status.toLowerCase()}</styleUrl>
      <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
    </Placemark>`,
    )
    .join("\n");
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Peta Pohon Desa ${desa}</name>
${Object.entries(KML_COLOR)
  .map(
    ([status, warna]) => `    <Style id="${status.toLowerCase()}">
      <IconStyle><color>${warna}</color><scale>1.1</scale></IconStyle>
    </Style>`,
  )
  .join("\n")}
${placemarks}
  </Document>
</kml>`;
  unduhBlob(`peta-${slug(desa)}.kml`, kml, "application/vnd.google-earth.kml+xml");
}

async function unduhPDF(desa: string, pohon: ApiPetaPohon[]) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40; // margin

  // ---- Halaman 1: peta sebaran ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Peta Pohon Desa ${desa}`, M, M);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Pohon Asuh · ${pohon.length} pohon · dibuat ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
    M,
    M + 16,
  );

  const titik = pohon.filter((p) => p.lat !== null && p.lng !== null);
  if (titik.length > 0) {
    const lats = titik.map((p) => p.lat!);
    const lngs = titik.map((p) => p.lng!);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    // Padding 10% supaya titik tepi tak menempel batas.
    const padLat = (maxLat - minLat || 0.001) * 0.1;
    const padLng = (maxLng - minLng || 0.001) * 0.1;
    minLat -= padLat;
    maxLat += padLat;
    minLng -= padLng;
    maxLng += padLng;

    const areaW = W - M * 2;
    const areaH = H - M * 2 - 90; // ruang utk header + legenda
    const skala = Math.min(areaW / (maxLng - minLng), areaH / (maxLat - minLat));
    const x0 = M + (areaW - (maxLng - minLng) * skala) / 2;
    const yTop = M + 40 + (areaH - (maxLat - minLat) * skala) / 2;
    const px = (lng: number) => x0 + (lng - minLng) * skala;
    const py = (lat: number) => yTop + (maxLat - lat) * skala;

    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.rect(x0, yTop, (maxLng - minLng) * skala, (maxLat - minLat) * skala);

    for (const p of titik) {
      const warna =
        p.status === "AVAILABLE" ? [16, 185, 129] : p.status === "RESERVED" ? [245, 158, 11] : [113, 113, 122];
      doc.setFillColor(warna[0], warna[1], warna[2]);
      const r = p.status === "ADOPTED" ? 1.6 : 2.4;
      doc.circle(px(p.lng!), py(p.lat!), r, "F");
      if (p.status !== "ADOPTED") {
        doc.setFontSize(5.5);
        doc.setTextColor(60);
        doc.text(p.code, px(p.lng!) + 4, py(p.lat!) + 2);
        doc.setTextColor(0);
      }
    }

    // Legenda + info koordinat bbox (acuan navigasi manual).
    const legendY = H - M - 28;
    let lx = M;
    doc.setFontSize(8);
    for (const [label, warna] of [
      ["Tersedia", [16, 185, 129]],
      ["Dipesan", [245, 158, 11]],
      ["Teradopsi", [113, 113, 122]],
    ] as const) {
      doc.setFillColor(warna[0], warna[1], warna[2]);
      doc.circle(lx + 3, legendY - 3, 3, "F");
      doc.text(label, lx + 10, legendY);
      lx += 14 + doc.getTextWidth(label) + 16;
    }
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(
      `Batas: ${minLat.toFixed(5)},${minLng.toFixed(5)} s.d. ${maxLat.toFixed(5)},${maxLng.toFixed(5)} (Lintang, Bujur)`,
      M,
      H - M - 8,
    );
    doc.setTextColor(0);
  }

  // ---- Halaman berikut: daftar pohon ±35 baris/hal ----
  const BARIS_PER_HAL = 35;
  const kolom = [
    { label: "Kode", w: 50 },
    { label: "Nama Lokal", w: 140 },
    { label: "Status", w: 60 },
    { label: "Lintang", w: 70 },
    { label: "Bujur", w: 80 },
  ] as const;
  const mulaiX = M;
  const tinggiBaris = 16;

  for (let hal = 0; hal * BARIS_PER_HAL < pohon.length; hal++) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Daftar Pohon Desa ${desa} — hal ${hal + 1}/${Math.ceil(pohon.length / BARIS_PER_HAL)}`, M, M);
    doc.setFont("helvetica", "normal");

    let y = M + 26;
    let x = mulaiX;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    for (const k of kolom) {
      doc.text(k.label, x, y);
      x += k.w;
    }
    doc.setDrawColor(180);
    doc.line(M, y + 4, W - M, y + 4);
    doc.setFont("helvetica", "normal");
    y += tinggiBaris;

    const potongan = pohon.slice(hal * BARIS_PER_HAL, (hal + 1) * BARIS_PER_HAL);
    for (const p of potongan) {
      x = mulaiX;
      const sel = [
        p.code,
        p.localName.slice(0, 28),
        STATUS_LABEL[p.status],
        p.lat !== null ? p.lat.toFixed(6) : "-",
        p.lng !== null ? p.lng.toFixed(6) : "-",
      ];
      for (let i = 0; i < sel.length; i++) {
        doc.text(sel[i], x, y);
        x += kolom[i].w;
      }
      y += tinggiBaris;
      if (y > H - M) break;
    }
  }

  doc.save(`peta-${slug(desa)}.pdf`);
}

const btn =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function PetaDownloadPanel({ desa, pohon }: { desa: string; pohon: ApiPetaPohon[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const kosong = pohon.length === 0;

  const jalankan = async (aksi: string, fn: () => void | Promise<void>) => {
    setBusy(aksi);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
      <p className="font-semibold text-emerald-950 dark:text-emerald-50">Peta Offline</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Unduh peta desa {desa} untuk dipakai petugas menandai pohon di lapangan tanpa internet.
        GeoJSON/KML bisa dibuka di aplikasi peta offline (OsmAnd, Organic Maps, Google Earth);
        PDF siap dicetak.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={kosong || busy !== null}
          onClick={() => jalankan("pdf", () => unduhPDF(desa, pohon))}
          className={`${btn} pa-btn-primary text-white hover:bg-emerald-700`}
        >
          <FileText className="h-4 w-4" />
          {busy === "pdf" ? "Menyiapkan…" : "Unduh PDF"}
        </button>
        <button
          type="button"
          disabled={kosong || busy !== null}
          onClick={() => jalankan("kml", () => unduhKML(desa, pohon))}
          className={`${btn} border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-emerald-300 dark:hover:bg-night-800`}
        >
          <MapIcon className="h-4 w-4" />
          {busy === "kml" ? "Menyiapkan…" : "Unduh KML"}
        </button>
        <button
          type="button"
          disabled={kosong || busy !== null}
          onClick={() => jalankan("geojson", () => unduhGeoJSON(desa, pohon))}
          className={`${btn} border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-emerald-300 dark:hover:bg-night-800`}
        >
          <FileJson className="h-4 w-4" />
          {busy === "geojson" ? "Menyiapkan…" : "Unduh GeoJSON"}
        </button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        <Download className="h-3.5 w-3.5" />
        {pohon.filter((p) => p.lat !== null && p.lng !== null).length} titik berkoordinat dari{" "}
        {pohon.length} pohon.
      </p>
    </div>
  );
}
