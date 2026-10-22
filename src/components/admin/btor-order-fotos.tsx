"use client";

import { useState } from "react";
import LaporanFotoPopup from "@/components/admin/laporan-foto-popup";

// Strip thumbnail foto order di tab Order & Pohon BTOR — klik membuka
// popup galeri navigasi (komponen sama dengan galeri laporan/pohon).
export default function BtorOrderFotos({
  judul,
  fotos,
}: {
  judul: string;
  fotos: { id: number; url: string }[];
}) {
  const [buka, setBuka] = useState<number | null>(null);

  return (
    <>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-label={`Perbesar foto ${i + 1} ${judul}`}
            data-testid="order-foto"
            onClick={() => setBuka(i)}
            className="group shrink-0 overflow-hidden rounded-xl border border-emerald-100 transition hover:border-emerald-400 dark:border-night-700 dark:hover:border-emerald-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.url}
              alt={`Foto tagging ${judul}`}
              className="h-20 w-20 object-cover transition group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      {buka !== null && (
        <LaporanFotoPopup
          judul={judul}
          entity="pohon"
          fotos={fotos}
          start={buka}
          onClose={() => setBuka(null)}
        />
      )}
    </>
  );
}
