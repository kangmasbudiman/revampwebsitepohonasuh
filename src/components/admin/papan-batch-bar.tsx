"use client";

import { useRef, useState } from "react";
import { useSyncExternalStore } from "react";
import { toBlob } from "html-to-image";
import JSZip from "jszip";
import { Download, Loader2, X } from "lucide-react";
import type { ApiOrderRow } from "@/lib/api";
import {
  clearPapanSelection,
  papanSnapshot,
  subscribePapan,
} from "@/lib/papan-selection";
import PapanTaging from "./papan-taging";

// Ukuran template papan asli — dirender offscreen 1:1 supaya hasil PNG
// beresolusi cetak (±200 DPI pada A4 lanskap).
const LEBAR = 2382;
const TINGGI = 1684;

function namaFile(o: ApiOrderRow) {
  return `papan-${o.idpohon || "pohon"}-${o.id}.png`;
}

// Bar aksi melayang: unduh SEMUA papan taging pohon yang diconteng dalam
// satu file ZIP (render PNG satu-per-satu dari komponen PapanTaging yang
// sama dengan halaman pratinjau).
export default function PapanBatchBar() {
  const sel = useSyncExternalStore(subscribePapan, papanSnapshot, papanSnapshot);
  const list = [...sel.values()];
  const [proses, setProses] = useState(false);
  const [selesai, setSelesai] = useState(0);
  const [gagal, setGagal] = useState(0);
  const [current, setCurrent] = useState<ApiOrderRow | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  async function unduh() {
    if (proses || list.length === 0) return;
    setProses(true);
    setSelesai(0);
    setGagal(0);
    const zip = new JSZip();
    let sukses = 0;
    try {
      await document.fonts.ready;
      for (let i = 0; i < list.length; i++) {
        setCurrent(list[i]);
        // Dua frame + jeda kecil: pastikan React selesai render sebelum clone.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 50));
        const node = boxRef.current;
        if (!node) break;
        // Template <img> harus selesai dimuat (frame pertama bisa kosong).
        const img = node.querySelector("img");
        if (img && !img.complete) {
          await new Promise((r) => {
            img.addEventListener("load", r, { once: true });
            img.addEventListener("error", r, { once: true });
          });
        }
        try {
          const blob = await toBlob(node, { width: LEBAR, height: TINGGI, pixelRatio: 1 });
          if (!blob) throw new Error("blob null");
          zip.file(namaFile(list[i]), blob);
          sukses++;
        } catch {
          setGagal((g) => g + 1);
        }
        setSelesai(i + 1);
      }
      if (sukses > 0) {
        const out = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(out);
        const a = document.createElement("a");
        a.href = url;
        a.download = `papan-taging-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setCurrent(null);
      setProses(false);
    }
  }

  if (list.length === 0) return null;

  return (
    <>
      {/* Media render tersembunyi — div luar menggeser keluar viewport;
          yang dicapture HARUS wrapper dalam yang statis (clone html-to-image
          mempertahankan posisi elemen root — root yang fixed/offset akan
          tergeser juga di dalam hasil gambar → PNG kosong). */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 z-[-1]"
        style={{ left: "-10000px" }}
      >
        <div ref={boxRef} style={{ width: LEBAR, height: TINGGI }}>
          {current && <PapanTaging order={current} chrome={false} />}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 print:hidden">
        <div className="pa-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-emerald-200 px-4 py-3 shadow-lg dark:border-night-700">
          <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
            {proses
              ? `Menyiapkan papan ${Math.min(selesai + 1, list.length)} dari ${list.length}…`
              : `${list.length} pohon dipilih untuk papan taging`}
          </p>
          {gagal > 0 && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {gagal} papan gagal dibuat
            </p>
          )}
          <button
            type="button"
            onClick={unduh}
            disabled={proses}
            data-testid="unduh-papan-batch"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#249689] to-[#10791D] px-4 py-2 text-xs font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {proses ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download Papan Taging ({list.length})
          </button>
          <button
            type="button"
            onClick={clearPapanSelection}
            disabled={proses}
            aria-label="Kosongkan pilihan papan"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            <X className="h-3.5 w-3.5" /> Kosongkan
          </button>
        </div>
      </div>
    </>
  );
}
