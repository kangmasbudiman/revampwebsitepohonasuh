"use client";

import { useState } from "react";
import Image from "next/image";
import { Images } from "lucide-react";
import { isDefaultTreePhoto } from "@/lib/api";
import LaporanFotoPopup from "@/components/admin/laporan-foto-popup";

// Gambar utama detail pohon sekaligus pintu galeri: klik membuka popup
// navigasi foto (komponen sama dengan Laporan Kegiatan) — galeri tidak
// lagi dirender sebagai grid terpisah di bawah halaman.
export default function TreeHero({
  nama,
  photoUrl,
  galeri,
  ariaLabel,
}: {
  nama: string;
  photoUrl: string;
  galeri: string[];
  ariaLabel: string;
}) {
  const [buka, setBuka] = useState(false);

  const utama = isDefaultTreePhoto(photoUrl) ? null : photoUrl;
  const semua = Array.from(new Set([utama, ...galeri].filter((u): u is string => !!u))).map(
    (url, i) => ({ id: i, url }),
  );
  const bisaBuka = semua.length > 1;

  const isi = (hover: boolean) => (
    <>
      <Image
        src={utama ?? semua[0]?.url ?? photoUrl}
        alt={nama}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className={`object-cover${hover ? " transition-transform duration-300 group-hover:scale-[1.02]" : ""}`}
      />
      {bisaBuka && (
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <Images className="h-3.5 w-3.5" aria-hidden />
          {semua.length}
        </span>
      )}
    </>
  );

  if (!bisaBuka) {
    return (
      <div className="relative h-80 overflow-hidden rounded-3xl bg-emerald-50 sm:h-96">{isi(false)}</div>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel.replaceAll("{name}", nama).replaceAll("{n}", String(semua.length))}
        onClick={() => setBuka(true)}
        className="group relative block h-80 w-full cursor-zoom-in overflow-hidden rounded-3xl bg-emerald-50 sm:h-96"
      >
        {isi(true)}
      </button>
      {buka && (
        <LaporanFotoPopup
          judul={nama}
          fotos={semua}
          entity="pohon"
          onClose={() => setBuka(false)}
        />
      )}
    </>
  );
}
