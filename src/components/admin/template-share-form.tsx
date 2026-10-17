"use client";

import { useActionState } from "react";
import { createTemplateShare, updateTemplateShare } from "@/lib/actions/template-share";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiTemplateShare } from "@/lib/api";
import FileInput from "@/components/file-input";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

// Checkbox tercentang selalu kirim nilai; kosong = 0 (bendera() di action).
const checkCls =
  "mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-night-600 dark:bg-night-950";

export default function TemplateShareForm({
  desaOptions,
  template,
}: {
  desaOptions: string[];
  template?: ApiTemplateShare;
}) {
  const isEdit = !!template;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateTemplateShare : createTemplateShare,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={template?.id} />
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Desa *</label>
        {isEdit ? (
          <p className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-night-700 dark:bg-night-950 dark:text-zinc-200">
            {template?.desa}
          </p>
        ) : desaOptions.length === 0 ? (
          <p className="mt-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Belum ada desa yang ditugaskan untuk Anda — hubungi admin.
          </p>
        ) : (
          <select name="desa" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Pilih desa…
            </option>
            {desaOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Nama *</label>
        <input
          name="nama"
          type="text"
          required
          maxLength={100}
          defaultValue={template?.nama}
          className={inputClass}
          placeholder="Mis. Desain Story Lebaran"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Gambar latar <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <FileInput name="gambar" />
        {isEdit && template?.file && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Biarkan kosong untuk mempertahankan gambar ({template.file}).
          </p>
        )}
      </div>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name="utama"
          value="1"
          defaultChecked={template?.utama}
          className={`${checkCls} mt-0.5`}
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-200">
          Jadikan template utama desa ini (default pilihan pengadopsi)
        </span>
      </label>
      {isEdit && (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="aktif"
            value="1"
            defaultChecked={template ? template.aktif : true}
            className={`${checkCls} mt-0.5`}
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Aktif (tampil di pilihan pengadopsi)</span>
        </label>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending || (!isEdit && desaOptions.length === 0)}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Template"}
      </button>
    </form>
  );
}
