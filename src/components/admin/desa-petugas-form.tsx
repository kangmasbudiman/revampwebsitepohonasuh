"use client";

import { saveDesaPetugas } from "@/lib/actions/penugasan";
import type { ApiDesaPenugasan, ApiPetugasRingkas } from "@/lib/api";

// updatedesapetugas full-replace: form mengirim seluruh checkbox terpilih.
export default function DesaPetugasForm({
  desa,
  semuaPetugas,
}: {
  desa: ApiDesaPenugasan;
  semuaPetugas: ApiPetugasRingkas[];
}) {
  const assigned = new Set(desa.petugas.map((p) => p.id));

  return (
    <form action={saveDesaPetugas} className="mt-3 space-y-3">
      <input type="hidden" name="iddesa" value={desa.id} />
      {semuaPetugas.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada akun petugas.</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {semuaPetugas.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                name="petugas"
                value={p.id}
                defaultChecked={assigned.has(p.id)}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-200 dark:border-night-700 dark:focus:ring-emerald-900"
              />
              {p.nama}
            </label>
          ))}
        </div>
      )}
      <button
        type="submit"
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Simpan Penugasan
      </button>
    </form>
  );
}
