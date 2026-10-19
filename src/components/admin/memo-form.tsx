"use client";

import { useState } from "react";
import { FileSignature } from "lucide-react";
import { simpanMemo } from "@/lib/actions/laporan";
import type { ApiLaporan } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

// Form terbit/edit Memo Pencairan (admin) — hanya muncul setelah BTOR
// diverifikasi. Default diambil dari data laporan (dana & rekening BTOR).
export default function MemoForm({ laporan }: { laporan: ApiLaporan }) {
  const memo = laporan.memo;
  const [jumlah, setJumlah] = useState(
    memo ? String(Math.round(memo.jumlah)) : laporan.dana ? String(Math.round(laporan.dana)) : "",
  );
  const [open, setOpen] = useState(!memo);

  const digits = jumlah.replace(/\D/g, "");
  const display = digits ? Number(digits).toLocaleString("id-ID") : "";

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
          {memo ? `Edit Memo ${memo.nomor}` : "Terbitkan Memo Pencairan"}
        </span>
        <span className="text-xs text-zinc-400">{open ? "Tutup" : "Buka"}</span>
      </button>

      {open && (
        <form action={simpanMemo} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="idlaporan" value={laporan.id} />
          {memo && <input type="hidden" name="id_memo" value={memo.id} />}

          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Tanggal memo
            <input
              name="tanggal"
              type="date"
              required
              defaultValue={memo?.tanggal || new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Jumlah dana dicairkan
            <span className="relative mt-1 block">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-zinc-500">
                Rp
              </span>
              <input
                name="jumlah"
                type="text"
                inputMode="numeric"
                required
                value={display}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                className={`${inputClass} pl-11 text-right font-medium tabular-nums`}
              />
            </span>
          </label>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Penerima (a.n.)
            <input
              name="penerima"
              type="text"
              required
              defaultValue={memo?.penerima || laporan.rekeningAt || laporan.petugas}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Bank
              <input
                name="bank"
                type="text"
                defaultValue={memo?.bank || laporan.rekeningBank}
                placeholder="mis. BRI"
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              No. rekening
              <input
                name="norek"
                type="text"
                defaultValue={memo?.norek || laporan.rekeningNorek}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300 sm:col-span-2">
            Keperluan / uraian pencairan
            <textarea
              name="keperluan"
              rows={2}
              defaultValue={memo?.keperluan || `Pencairan dana kegiatan ${laporan.judul}`}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Ditandatangani (nama)
            <input
              name="ttd_nama"
              type="text"
              defaultValue={memo?.ttdNama}
              placeholder="mis. Admin Pohon Asuh"
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Jabatan penandatangan
            <input
              name="ttd_jabatan"
              type="text"
              defaultValue={memo?.ttdJabatan}
              placeholder="mis. Koordinator Program"
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-zinc-600 dark:text-zinc-300 sm:col-span-2">
            Catatan pencairan <span className="text-zinc-400">(opsional)</span>
            <input
              name="catatan_pencairan"
              type="text"
              defaultValue={memo?.catatanPencairan}
              placeholder="mis. Ditransfer 16 April 2026"
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-2">
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
