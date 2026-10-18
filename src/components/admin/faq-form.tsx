"use client";

import { useActionState } from "react";
import { createFaq, updateFaq } from "@/lib/actions/faq";
import type { AdminState } from "@/lib/actions/admin";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

// Form FAQ dipakai untuk tambah maupun edit (props `faq` untuk edit).
// Checkbox aktif mengontrol tampil/sembunyi di halaman publik /faq.
export default function FaqForm({
  faq,
  defaultOrder = 1,
}: {
  faq?: { id: number; question: string; answer: string; sortOrder: number; aktif: boolean };
  defaultOrder?: number;
}) {
  const isEdit = !!faq;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateFaq : createFaq,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={faq!.id} />}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Pertanyaan *</label>
        <input
          name="question"
          type="text"
          required
          maxLength={300}
          defaultValue={faq?.question ?? ""}
          className={inputClass}
          placeholder="Mis. Apa itu program Pohon Asuh?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Jawaban *</label>
        <textarea
          name="answer"
          rows={4}
          required
          defaultValue={faq?.answer ?? ""}
          className={inputClass}
          placeholder="Jawaban yang tampil saat pertanyaan diklik di halaman FAQ."
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-32">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Urutan</label>
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={faq?.sortOrder ?? defaultOrder}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            name="aktif"
            defaultChecked={faq ? faq.aktif : true}
            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-night-600 dark:bg-night-950"
          />
          Tampil di halaman publik
        </label>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
          FAQ tersimpan — halaman publik langsung diperbarui.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah FAQ"}
      </button>
    </form>
  );
}
