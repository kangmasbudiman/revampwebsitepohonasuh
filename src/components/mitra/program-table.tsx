"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatBudget, formatProvinsi } from "@/lib/format";
import type { ApiProgramMitra } from "@/lib/api";
import ProgramEditModal from "@/components/mitra/program-edit-modal";

// Tabel program mitra — klik tombol "Edit" di baris ini membuka popup
// ProgramEditModal (popup saja, bukan form inline ?edit=id).
export default function MitraProgramTable({
  programs,
  provinsiList,
  assetOrigin,
}: {
  programs: ApiProgramMitra[];
  provinsiList: string[];
  assetOrigin: string;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const editingProg = editingId ? programs.find((p) => p.id === editingId) ?? null : null;
  const logoSrc = (p: ApiProgramMitra) => (p.logo ? `${assetOrigin}/assets/${p.logo}` : null);

  return (
    <>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-4 py-3 font-semibold">No</th>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nama Program</th>
              <th className="px-4 py-3 font-semibold">Periode / Durasi</th>
              <th className="px-4 py-3 font-semibold">Budget</th>
              <th className="px-4 py-3 font-semibold">Provinsi</th>
              <th className="px-4 py-3 font-semibold">Logo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {programs.map((p, i) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.nama}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.tglMulai ?? "—"} → {p.tglSelesai ?? "—"}
                  {p.durasi && <span className="block text-zinc-400">{p.durasi}</span>}
                </td>
                <td className="px-4 py-2 text-[11px] whitespace-nowrap">{formatBudget(p.budget)}</td>
                <td className="px-4 py-3 text-xs">{formatProvinsi(p.provinsi)}</td>
                <td className="px-4 py-3">
                  {p.logo ? (
                    <Image
                      src={logoSrc(p) ?? ""}
                      alt={`Logo ${p.nama}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-xl border border-emerald-100 bg-white object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      p.aktif ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {p.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/mitra/program?detail=${p.id}`}
                      className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Detail
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingId(p.id)}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                  Belum ada program. Buat di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingProg && (
        <ProgramEditModal
          program={editingProg}
          logoSrc={logoSrc(editingProg)}
          provinsiList={provinsiList}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
