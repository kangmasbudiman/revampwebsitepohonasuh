"use client";

import { useMemo, useState } from "react";
import { requestPesananMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { CheckCircle2, MapPin, Search, TreePine, X } from "lucide-react";
import Image from "next/image";
import { namaDesa } from "@/lib/format";

export type PickableTree = {
  id: number;
  code: string;
  localName: string;
  species: string | null;
  desa: string;
  priceIdr: number;
  photoUrl: string;
  diameterCm: number | null;
};

export default function MitraPohonOrderForm({
  trees,
  desas,
  programs,
}: {
  trees: PickableTree[];
  desas: { id: number; name: string }[];
  programs: { id: number; nama: string }[];
}) {
  const [desa, setDesa] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return trees.filter((t) => {
      if (desa && t.desa !== desa) return false;
      if (!needle) return true;
      return (
        t.code.toLowerCase().includes(needle) ||
        t.localName.toLowerCase().includes(needle) ||
        (t.species ?? "").toLowerCase().includes(needle)
      );
    });
  }, [trees, desa, q]);

  const shown = filtered.slice(0, 120);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };
  const clearSelection = () => setSelected([]);
  const selectAllShown = () => setSelected((prev) => Array.from(new Set([...prev, ...shown.map((t) => t.code)])));

  return (
    <form action={requestPesananMitra} className="mt-6 space-y-4">
      <input type="hidden" name="pohon_pilihan" value={selected.join(",")} />

      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300"><MapPin className="h-4 w-4" />Lokasi / Desa (opsional)</span>
            <select name="desa" value={desa} onChange={(e) => setDesa(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
              <option value="">Semua lokasi / dipilih admin</option>
              {desas.map((d) => (
                <option key={d.id} value={d.name}>{namaDesa(d.name)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Program (opsional)</span>
            <select name="program_id" defaultValue="0" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
              <option value="0">— Tanpa program —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Catatan (opsional)</span>
          <input name="catatan" placeholder="mis. minimal diameter 30cm, prioritaskan desa X" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
        </label>
      </div>

      {/* Tree picker */}
      <div className="rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200"><TreePine className="h-4 w-4" />Pilih Pohon Tersedia <span className="font-normal text-zinc-400">(opsional — jika kosong, admin yang pilihkan otomatis)</span></p>
            <p className="mt-0.5 text-[11px] text-zinc-500">Tersedia di produksi: {trees.length.toLocaleString("id-ID")} pohon</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button type="button" onClick={clearSelection} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-night-700 dark:text-zinc-300">
                <X className="h-3.5 w-3.5" />Kosongkan
              </button>
            )}
            {shown.length > 0 && (
              <button type="button" onClick={selectAllShown} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
                Pilih semua yang tampil
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-emerald-50 p-3 dark:border-night-800">
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama pohon…" className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" aria-label="Cari pohon" />
          </label>
        </div>

        {selected.length > 0 && (
          <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-2.5 text-xs font-semibold text-emerald-800 dark:border-night-700 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="mr-1 inline h-4 w-4" aria-hidden />{selected.length} pohon dipilih
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead sticky top-0 z-10 border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="w-10 px-3 py-3"></th>
                <th className="px-3 py-3 font-semibold">Kode</th>
                <th className="px-3 py-3 font-semibold">Pohon</th>
                <th className="px-3 py-3 font-semibold">Lokasi</th>
                <th className="px-3 py-3 text-right font-semibold">Ø (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {shown.map((t) => {
                const checked = selectedSet.has(t.code);
                return (
                  <tr key={t.code} className={checked ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={checked} onChange={() => toggle(t.code)} className="h-4 w-4 accent-emerald-700" aria-label={`Pilih ${t.code}`} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{t.code}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-emerald-50 dark:bg-night-800">
                          <Image src={t.photoUrl} alt={t.localName} fill sizes="36px" className="object-cover" />
                        </span>
                        <span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">{t.localName}</p>
                          <p className="text-[11px] italic text-zinc-500">{t.species ?? ""}</p>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-300">{namaDesa(t.desa)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{t.diameterCm ?? "—"}</td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">Tidak ada pohon tersedia cocok dengan filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > shown.length && (
          <p className="border-t border-emerald-50 px-5 py-2 text-[11px] text-zinc-500 dark:border-night-800">
            Menampilkan {shown.length} dari {filtered.length} pohon — gunakan pencarian untuk lebih spesifik.
          </p>
        )}
      </div>

      {/* Jumlah + submit */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Jumlah pohon {selected.length > 0 ? "" : "*"}</span>
          {selected.length > 0 ? (
            <p className="mt-0.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">{selected.length} pohon dipilih → jumlah otomatis</p>
          ) : (
            <input name="jumlah" type="number" min={1} max={500} defaultValue={10} required className="mt-1 w-32 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          )}
        </div>
        <SubmitButton pendingLabel="Mengirim pesanan…" className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700">
          Kirim Permintaan Pemesanan
        </SubmitButton>
      </div>
    </form>
  );
}
