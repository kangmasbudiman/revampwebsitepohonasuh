"use client";

import { useState } from "react";
import { requestHoldMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import type { ApiTree } from "@/lib/api";
import { namaDesa } from "@/lib/format";
import Image from "next/image";

export default function MitraRequestHoldForm({ trees }: { trees: ApiTree[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (code: string) => {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  return (
    <form action={requestHoldMitra} className="mt-6 space-y-4">
      <input type="hidden" name="idpohonStr" value={selected.join(",")} />
      {selected.length > 0 && (
        <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {selected.length} pohon dipilih
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-3 py-3" />
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Pohon</th>
              <th className="px-4 py-3 font-semibold">Lokasi</th>
              <th className="px-4 py-3 text-right font-semibold">Harga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {trees.map((t) => (
              <tr key={t.code}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.code)}
                    onChange={() => toggle(t.code)}
                    className="h-4 w-4 accent-emerald-700"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-emerald-50 dark:bg-night-800">
                      <Image src={t.photoUrl} alt={t.localName} fill sizes="36px" className="object-cover" />
                    </span>
                    <span>
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">{t.localName}</p>
                      <p className="text-xs italic text-zinc-500">{t.species}</p>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{namaDesa(t.desa)}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-800">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(t.priceIdr)}
                </td>
              </tr>
            ))}
            {trees.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Tidak ada pohon tersedia.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SubmitButton
        pendingLabel="Memproses…"
        disabled={selected.length === 0}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Request Hold {selected.length > 0 ? `${selected.length} Pohon` : ""}
      </SubmitButton>
    </form>
  );
}
