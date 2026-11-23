"use client";

import { useState } from "react";
import { namaDesa, rupiah, tanggal, infoMasaProgram } from "@/lib/format";
import type { ApiProgramMitra, OrderTreeMini } from "@/lib/api";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { hapusPesananMitra } from "@/lib/actions/mitra";
import OrderDetailModal, { statusLabelFor, type RiwayatRow } from "@/components/mitra/order-detail-modal";

export type { RiwayatRow };

// Tabel Riwayat Pemesanan (client — ada kolom Detail → popup OrderDetailModal).
export default function MitraRiwayatTable({
  rows,
  programs,
}: {
  rows: RiwayatRow[];
  programs: ApiProgramMitra[];
}) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const detailRow = detailId ? rows.find((r) => r.id === detailId) ?? null : null;
  const progMap = new Map(programs.map((p) => [p.id, p]));

  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Tgl Mulai</th>
              <th className="px-4 py-3">Tgl Selesai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pohon</th>
              <th className="px-4 py-3 text-right">Waktu</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {rows.map((r, i) => {
              const prog = progMap.get(r.program_id ?? 0);
              const lbl = statusLabelFor(r, prog);
              const masa = infoMasaProgram(prog?.tglSelesai);
              const lokasi = r.desa ?? (r.trees && r.trees.length > 0 ? r.trees[0].desa : null);
              return (
                <tr
                  key={r.id}
                  className={
                    masa.status === "near"
                      ? "bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/10"
                      : "hover:bg-emerald-50/50 dark:hover:bg-night-800/40"
                  }
                >
                  <td className="px-4 py-3 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{lokasi ? namaDesa(lokasi) : "Semua desa"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.program_nama ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{r.jumlah}</td>
                  <td className="px-4 py-3 font-semibold">{prog?.budget ? rupiah(prog.budget) : "—"}</td>
                  <td className="px-4 py-3 text-xs">{prog?.tglMulai ? tanggal(prog.tglMulai) : "—"}</td>
                  <td className="px-4 py-3 text-xs">{prog?.tglSelesai ? tanggal(prog.tglSelesai) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${lbl[1]}`}>{lbl[0]}</span>
                    {masa.status === "near" && (
                      <span className="mt-1 block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        ⏳ Segera berakhir · {masa.days} hari
                      </span>
                    )}
                    {masa.status === "expired" && (
                      <span className="mt-1 block w-fit rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                        Masa program habis
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{renderTrees(r.trees)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{r.created_at ? tanggal(r.created_at) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailId(r.id)}
                      className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                    >
                      Detail
                    </button>
                    {r.status !== "dihapus" && (
                      <form action={hapusPesananMitra} className="ml-1 inline">
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmSubmit
                          message={`Hapus pesanan #${r.id}? Pesanan akan berstatus "Dihapus" dan pohon yang dipesan dikembalikan ke pool.`}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Hapus
                        </ConfirmSubmit>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailRow && (
        <OrderDetailModal
          order={detailRow}
          program={progMap.get(detailRow.program_id ?? 0)}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}

// Mini-list pohon di kolom "Pohon" (tanpa modal-in-modal dari OrderTreesModal).
function renderTrees(trees: OrderTreeMini[] | undefined) {
  if (!trees || trees.length === 0) return <span className="text-xs text-zinc-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {trees.slice(0, 6).map((t) => (
        <span key={t.code} className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          {t.code}
        </span>
      ))}
      {trees.length > 6 && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300">+{trees.length - 6}</span>}
    </div>
  );
}
