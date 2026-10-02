"use client";

import { useActionState } from "react";
import { updateAdopsi } from "@/lib/actions/adopsi";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiAdopsi } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-200";

const METHODS = ["Transfer", "Cash", "PayPal", "Carity"];

export default function AdopsiForm({ row }: { row: ApiAdopsi }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(updateAdopsi, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={row.id} />
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div>
        <label className={labelClass}>Nama Penerima (di sertifikat) *</label>
        <input name="nama" type="text" required defaultValue={row.nama} className={inputClass} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nomor Sertifikat (Certnum) *</label>
          <input
            name="certnum"
            type="text"
            required
            defaultValue={row.certnum}
            placeholder="001/LPHD-RA/2026"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Metode Pembayaran</label>
          <input name="methode" type="text" list="adopsi-methode" defaultValue={row.methode} className={inputClass} />
          <datalist id="adopsi-methode">
            {METHODS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Durasi (tahun)</label>
          <input
            name="dur"
            type="number"
            min={1}
            max={5}
            defaultValue={row.dur ?? 1}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Donasi (Rp)</label>
          <input
            name="price"
            type="number"
            min={0}
            step={1000}
            defaultValue={row.price ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Tanggal Adopsi</label>
          <input name="tgl_adopt" type="date" defaultValue={row.tglAdopt ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tanggal Berakhir</label>
          <input name="tgl_exp" type="date" defaultValue={row.tglExp ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
