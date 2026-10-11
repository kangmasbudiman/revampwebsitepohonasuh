"use client";

import { useState } from "react";
import Image from "next/image";
import type { ApiLaporanFoto } from "@/lib/api";
import LaporanFotoPopup from "@/components/admin/laporan-foto-popup";

// Grid galeri foto laporan di halaman publik — klik foto membuka popup
// navigasi (komponen sama dengan panel admin).
export default function LaporanGaleri({
  judul,
  fotos,
}: {
  judul: string;
  fotos: ApiLaporanFoto[];
}) {
  const [aktif, setAktif] = useState<number | null>(null);

  if (fotos.length === 0) return null;
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-label={`Lihat foto ${i + 1}`}
            onClick={() => setAktif(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50"
          >
            <Image
              src={f.url}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      {aktif !== null && (
        <LaporanFotoPopup
          judul={judul}
          fotos={fotos}
          start={aktif}
          onClose={() => setAktif(null)}
        />
      )}
    </>
  );
}
