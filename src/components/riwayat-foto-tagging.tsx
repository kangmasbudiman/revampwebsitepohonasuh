"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Images } from "lucide-react";

// Kartu riwayat adopsi di detail pohon + tombol "Foto Tagging" yang
// me-expand galeri bukti tagging siklus adopsi itu (collapse per kartu).
// children (avatar + kolom info) dan statusPill dirender server — komponen
// ini hanya mengelola state buka/tutup.
export default function RiwayatFotoTagging({
  foto,
  label,
  children,
  statusPill,
}: {
  foto: { url: string; tanggal: string | null }[];
  label: string;
  children: React.ReactNode;
  statusPill: React.ReactNode;
}) {
  const [buka, setBuka] = useState(false);

  return (
    <li
      data-testid="riwayat-item"
      className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {children}
        <div className="ml-auto flex flex-col items-end gap-2">
          {statusPill}
          {foto.length > 0 && (
            <button
              type="button"
              data-testid="toggle-foto-tagging"
              aria-expanded={buka}
              onClick={() => setBuka((v) => !v)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <Images className="h-3.5 w-3.5" />
              {label}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${buka ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {buka && foto.length > 0 && (
        <div
          data-testid="galeri-foto-tagging"
          className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
        >
          {foto.map((f, i) => (
            <a
              key={`${f.url}-${i}`}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              title={f.tanggal ?? label}
              className="block"
            >
              <Image
                src={f.url}
                alt={`${label} ${i + 1}`}
                width={160}
                height={160}
                className="h-20 w-full rounded-lg border border-emerald-100 object-cover transition-opacity hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
