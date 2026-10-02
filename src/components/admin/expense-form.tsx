"use client";

import { useActionState } from "react";
import { createExpense, type AdminState } from "@/lib/actions/admin";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function ExpenseForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(createExpense, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Uraian *</label>
          <input name="title" type="text" required className={inputClass} placeholder="contoh: Patroli hutan" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Kategori</label>
          <input name="category" type="text" className={inputClass} placeholder="contoh: Operasional" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Jumlah (Rp) *</label>
          <input name="amountIdr" type="number" required min="1000" step="1000" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Tanggal</label>
          <input name="spentAt" type="date" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Keterangan</label>
          <input name="description" type="text" className={inputClass} />
        </div>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan..." : "Catat Pengeluaran"}
      </button>
    </form>
  );
}
