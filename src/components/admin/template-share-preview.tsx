"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import ShareDesign, { type ShareDesignData } from "@/components/bagikan/share-design";
import { namaDesa } from "@/lib/format";

// Data contoh agar admin melihat posisi SELURUH zona teks (nama, kartu
// pohon, memo, certnum) di atas template yang diunggah/unggahnya.
export function sampleShareData(desa: string, imageUrl: string | null): ShareDesignData {
  return {
    nama: "Nama Pengadopsi Contoh",
    idpohon: "SRE052",
    localName: "Kasiah Baranak",
    species: "Rhodoleia championii",
    desaLabel: namaDesa(desa),
    tglAdopt: "2026-10-17",
    memo: "Pesan contoh untuk hutan — zona memo akan tampil di sini.",
    certnum: "001/LPHD-PO/2026",
    templateImage: imageUrl,
  };
}

// Design share dengan data contoh — dipakai di form & halaman edit admin.
export function ShareDesignSample({
  desa,
  imageUrl,
  className = "w-56",
}: {
  desa: string;
  imageUrl: string | null;
  className?: string;
}) {
  return (
    <div className={className} data-testid="share-design">
      <ShareDesign data={sampleShareData(desa, imageUrl)} />
    </div>
  );
}

// Tombol "Pratinjau" di baris tabel → modal design ukuran nyata.
export default function TemplateSharePreview({
  nama,
  desa,
  imageUrl,
}: {
  nama: string;
  desa: string;
  imageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-testid="pratinjau-share"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
      >
        <Eye className="h-3.5 w-3.5" />
        Pratinjau
      </button>

      {open && (
        <div
          data-testid="preview-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau ${nama}`}
            className="relative max-h-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-night-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{nama}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {namaDesa(desa)} — pratinjau dengan data contoh
                </p>
              </div>
              <button
                type="button"
                data-testid="preview-close"
                onClick={() => setOpen(false)}
                aria-label="Tutup pratinjau"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-night-800 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <ShareDesignSample desa={desa} imageUrl={imageUrl} className="mx-auto w-[min(340px,75vw)]" />
            </div>
            <p className="mt-4 mx-auto max-w-[min(340px,75vw)] text-center text-xs text-zinc-500 dark:text-zinc-400">
              Posisi teks pada design tetap — pastikan zona atas (nama), tengah (kartu
              pohon), dan bawah (nomor sertifikat) pada template Anda tidak tertutup
              elemen ramai.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
