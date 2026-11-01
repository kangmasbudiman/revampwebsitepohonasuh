"use client";

// Daftar lembar sertifikat satu order (section Adopsi Aktif di detail order).
// Order besar bisa puluhan lembar (per lokasi & per penerima hadiah) →
// daftar baris + kolom cari, bukan tumpukan tombol.

import { useState } from "react";
import { Search } from "lucide-react";
import { certUrl, shareUrl } from "@/lib/api";
import { namaDesa } from "@/lib/format";

export type CertificateItem = {
  certnum: string;
  desa: string;
  penerima: string; // nama penerima hadiah; kosong = lembar sendiri
  jumlah: number;
  idpohon: string; // kode pohon pertama utk parameter share
  kata: string; // teks gabungan desa+penerima+kode pohon utk pencarian
};

export default function CertificateList({
  items,
  labels,
}: {
  items: CertificateItem[];
  labels: {
    title: string;
    searchPh: string;
    view: string;
    share: string;
    certificate: string;
    certificates: string;
    treeWord: string;
    treesWord: string;
  };
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const hasil = needle
    ? items.filter((s) => s.kata.includes(needle))
    : items;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-emerald-950">{labels.title}</h2>
        <p className="text-sm text-zinc-500">
          {items.length} {items.length === 1 ? labels.certificate : labels.certificates}
        </p>
      </div>

      {items.length > 3 && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={labels.searchPh}
            className="w-full rounded-xl border border-emerald-100 bg-emerald-50/50 py-2.5 pr-4 pl-9 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-emerald-300 focus:bg-white"
          />
        </div>
      )}

      <ul className="mt-4 divide-y divide-emerald-50">
        {hasil.map((s) => (
          <li key={s.certnum} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-emerald-950">
                {namaDesa(s.desa)}
                {s.penerima ? <span className="font-normal text-zinc-500"> — {s.penerima}</span> : null}
              </p>
              <p className="text-xs text-zinc-500">
                {s.jumlah} {s.jumlah === 1 ? labels.treeWord : labels.treesWord} ·{" "}
                <span className="font-mono">{s.certnum}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={certUrl(s.certnum)}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                {labels.view}
              </a>
              <a
                href={`${shareUrl(s.certnum)}?pohon=${encodeURIComponent(s.idpohon)}`}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                {labels.share}
              </a>
            </div>
          </li>
        ))}
        {hasil.length === 0 && (
          <li className="py-6 text-center text-sm text-zinc-400">{labels.searchPh}</li>
        )}
      </ul>
    </div>
  );
}
