"use client";

import { useState } from "react";
import { FileSignature, Wallet } from "lucide-react";
import { simpanMemo } from "@/lib/actions/laporan";
import type { ApiLaporan } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

const labelClass = "block text-sm text-zinc-600 dark:text-zinc-300";

// Template isi memo untuk laporan tagging (bisa diedit petugas).
const TEMPLATE_TAGGING = [
  "Pada menu Order Tagging, kelompok menentukan pohon-pohon yang akan dipasangi banner tagging di lokasi.",
  "Data pohon yang telah ditentukan akan masuk ke dalam daftar pohon yang akan ditagging.",
  "Setelah pemasangan banner selesai, kelompok mengunggah foto dokumentasi setiap pohon sesuai dengan kode pohon yang telah ditentukan saat proses tagging. Foto dan data pohon tersebut digunakan secara otomatis sebagai lampiran pada halaman laporan kegiatan.",
].join("\n\n");

// Form terbit/edit Memo (format memorandum: Dari/Kepada/Proyek/Isi) — hanya
// untuk petugas ber-izin memo/admin, setelah BTOR diverifikasi. Dana &
// rekening pencairan otomatis dari BTOR, bukan bagian form.
export default function MemoForm({ laporan }: { laporan: ApiLaporan }) {
  const memo = laporan.memo;
  const [open, setOpen] = useState(!memo);

  const danaTampil = laporan.dana ? `Rp ${Number(laporan.dana).toLocaleString("id-ID")}` : "—";

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
          <FileSignature className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {memo ? `Edit Memo ${memo.nomor}` : "Terbitkan Memo"}
        </span>
        <span className="text-xs text-zinc-400">{open ? "Tutup" : "Buka"}</span>
      </button>

      {open && (
        <form action={simpanMemo} className="mt-4 space-y-4">
          <input type="hidden" name="idlaporan" value={laporan.id} />
          {memo && <input type="hidden" name="id_memo" value={memo.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Tanggal
              <input
                name="tanggal"
                type="date"
                required
                defaultValue={memo?.tanggal || new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Dari
              <input
                name="dari"
                type="text"
                required
                defaultValue={memo?.dari || laporan.petugas}
                placeholder="mis. Kelompok Taging Lunang"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Kepada
              <input
                name="kepada"
                type="text"
                required
                defaultValue={memo?.kepada || "Pohon Asuh"}
                placeholder="mis. Pohon Asuh"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Proyek
              <input
                name="proyek"
                type="text"
                required
                defaultValue={memo?.proyek || laporan.judul}
                placeholder="mis. Kegiatan Tagging Desa Lunang"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Memo <span className="text-zinc-400">(isi memorandum)</span>
              <textarea
                name="isi"
                rows={6}
                defaultValue={memo?.isi || (laporan.jenis === "tagging" ? TEMPLATE_TAGGING : "")}
                placeholder="Tuliskan isi memorandum…"
                className={inputClass}
              />
            </label>
          </div>

          <div className="rounded-xl bg-emerald-50/70 px-4 py-3 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            <span className="flex items-center gap-1.5 font-semibold">
              <Wallet className="h-3.5 w-3.5" />
              Dana pencairan otomatis dari BTOR
            </span>
            <p className="mt-1">
              {danaTampil} · a.n. {laporan.rekeningAt || laporan.petugas}
              {laporan.rekeningBank ? ` · ${laporan.rekeningBank} ${laporan.rekeningNorek}` : ""}
            </p>
          </div>

          <fieldset className="rounded-xl border border-zinc-100 px-4 py-3 dark:border-night-800">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Tanda tangan
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Nama penandatangan
                <input
                  name="ttd_nama"
                  type="text"
                  defaultValue={memo?.ttdNama || laporan.petugas}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Jabatan
                <input
                  name="ttd_jabatan"
                  type="text"
                  defaultValue={memo?.ttdJabatan}
                  placeholder="mis. Koordinator Lapangan"
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 sm:w-auto"
            >
              {memo ? "Simpan Perubahan Memo" : "Terbitkan Memo"}
            </button>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Nomor memo dibuat otomatis dan tidak bisa diubah.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
