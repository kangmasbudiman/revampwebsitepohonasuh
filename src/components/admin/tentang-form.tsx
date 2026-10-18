"use client";

import { useState } from "react";
import { useActionState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { simpanTentang } from "@/lib/actions/tentang";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiTentang } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

const checkCls =
  "h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-night-600 dark:bg-night-950";

type Baris = { id?: number; judul: string; isi: string; aktif: boolean };

// Form konten "Tentang Pohon Asuh": teks utama + daftar langkah dinamis
// (tambah/hapus/naik-turun). Baris langkah dikirim sebagai satu field
// hidden JSON.
export default function TentangForm({ tentang }: { tentang: ApiTentang }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(simpanTentang, {});
  const [baris, setBaris] = useState<Baris[]>(
    tentang.langkah.map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      judul: l.judul,
      isi: l.isi,
      aktif: (l.aktif ?? 1) !== 0,
    })),
  );

  const ubah = (i: number, patch: Partial<Baris>) =>
    setBaris((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const geser = (i: number, arah: -1 | 1) =>
    setBaris((prev) => {
      const j = i + arah;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Judul *</label>
        <input
          name="judul"
          type="text"
          required
          maxLength={150}
          defaultValue={tentang.judul ?? ""}
          className={inputClass}
          placeholder="Mis. Tentang Pohon Asuh"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Apa itu Pohon Asuh? <span className="text-zinc-400 dark:text-zinc-500">(deskripsi)</span>
        </label>
        <textarea
          name="deskripsi"
          rows={7}
          defaultValue={tentang.deskripsi ?? ""}
          className={inputClass}
          placeholder="Baris kosong memisahkan paragraf."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Mekanisme Program
        </label>
        <textarea
          name="mekanisme"
          rows={7}
          defaultValue={tentang.mekanisme ?? ""}
          className={inputClass}
          placeholder="Bagaimana dana adopsi bekerja — baris kosong memisahkan paragraf."
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Cara Mengasuh — langkah
          </label>
          <button
            type="button"
            onClick={() => setBaris((prev) => [...prev, { judul: "", isi: "", aktif: true }])}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Langkah
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {baris.map((b, i) => (
            <div
              key={b.id ?? `baru-${i}`}
              className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-night-700 dark:bg-night-800/40"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={b.judul}
                  onChange={(e) => ubah(i, { judul: e.target.value })}
                  maxLength={150}
                  placeholder="Judul langkah"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Naik"
                    disabled={i === 0}
                    onClick={() => geser(i, -1)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-emerald-700 disabled:opacity-30 dark:hover:bg-night-900"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Turun"
                    disabled={i === baris.length - 1}
                    onClick={() => geser(i, 1)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-emerald-700 disabled:opacity-30 dark:hover:bg-night-900"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus langkah ${i + 1}`}
                    onClick={() => setBaris((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <textarea
                value={b.isi}
                onChange={(e) => ubah(i, { isi: e.target.value })}
                rows={2}
                placeholder="Penjelasan langkah"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={b.aktif}
                  onChange={(e) => ubah(i, { aktif: e.target.checked })}
                  className={checkCls}
                />
                Tampil di halaman publik
              </label>
            </div>
          ))}
          {baris.length === 0 && (
            <p className="rounded-xl bg-zinc-50 dark:bg-night-800/50 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
              Belum ada langkah — klik &ldquo;Tambah Langkah&rdquo;. Halaman publik memakai teks
              bawaan selama konten belum diisi.
            </p>
          )}
        </div>
      </div>

      <input type="hidden" name="langkah" value={JSON.stringify(baris)} />

      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
          Konten Tentang tersimpan — halaman publik langsung diperbarui.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan Konten"}
      </button>
    </form>
  );
}
