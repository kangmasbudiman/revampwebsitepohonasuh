"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestPesananMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { CheckCircle2, MapPin, Search, TreePine, X, Leaf } from "lucide-react";
import Image from "next/image";
import { namaDesa, rupiah } from "@/lib/format";
import { co2TotalKg, formatCo2 } from "@/lib/karbon";

export type PickableTree = {
  id: number;
  code: string;
  localName: string;
  species: string | null;
  desa: string;
  priceIdr: number;
  photoUrl: string;
  diameterCm: number | null;
  heightM: number | null;
  co2Kg: number | null;
};

export default function MitraPohonOrderForm({
  trees,
  desas,
  programs,
  desaActive = "",
}: {
  trees: PickableTree[];
  desas: { id: number; name: string }[];
  programs: { id: number; nama: string }[];
  desaActive?: string;
}) {
  const router = useRouter();
  const desa = desaActive; // derived from URL — navigasi memicu re-fetch server-side
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return trees;
    return trees.filter((t) => {
      return (
        t.code.toLowerCase().includes(needle) ||
        t.localName.toLowerCase().includes(needle) ||
        (t.species ?? "").toLowerCase().includes(needle)
      );
    });
  }, [trees, q]);

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
            <select name="desa" value={desa} onChange={(e) => { const v = e.target.value; router.push(`/mitra/pesanan?desa=${encodeURIComponent(v)}#pilih-pohon`); }} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
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
      <div id="pilih-pohon" className="rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4 dark:border-night-700">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200"><TreePine className="h-4 w-4" />Pilih Pohon Tersedia <span className="font-normal text-zinc-400">(opsional — jika kosong, admin yang pilihkan otomatis)</span></p>
            <p className="mt-0.5 text-[11px] text-zinc-500">Tersedia di produksi: {trees.length.toLocaleString("id-ID")} pohon{desaActive ? ` (filter desa: ${namaDesa(desaActive)})` : ""}</p>
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

        <div className="max-h-[560px] overflow-y-auto">
          {shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">Tidak ada pohon tersedia cocok dengan filter.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 xl:grid-cols-5">
              {shown.map((t) => {
                const checked = selectedSet.has(t.code);
                const co2 = t.co2Kg ?? co2TotalKg(t.diameterCm);
                return (
                  <label key={t.code} className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-night-700 dark:bg-night-900 ${checked ? "border-emerald-500 ring-2 ring-emerald-300" : "border-emerald-100"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(t.code)} className="absolute right-2 top-2 z-10 h-5 w-5 rounded accent-emerald-600" aria-label={`Pilih ${t.code}`} />
                    <span className="relative block h-28 bg-emerald-50 sm:h-36">
                      <Image src={t.photoUrl} alt={t.localName} fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw" className="object-cover object-center" />
                      {co2 != null && co2 > 0 && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm backdrop-blur">
                          <Leaf className="h-3 w-3" aria-hidden />~{formatCo2(co2, "id")} CO₂
                        </span>
                      )}
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5 p-2 sm:p-2.5">
                      <span className="flex items-start justify-between gap-1">
                        <span className="line-clamp-1 text-xs font-bold text-emerald-950 sm:text-sm dark:text-emerald-100">{t.localName}</span>
                        <span className="shrink-0 whitespace-nowrap rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300">{t.code}</span>
                      </span>
                      <span className="line-clamp-1 text-[10px] italic text-zinc-500">{t.species ?? "—"}</span>
                      <span className="mt-0.5 text-[10px] text-zinc-500">📍 {namaDesa(t.desa)}</span>
                      <span className="text-[10px] text-zinc-500">📏 {t.heightM ? `T ${t.heightM} m · ` : ""}Ø {t.diameterCm ?? "—"} cm</span>
                      <span className="mt-auto pt-1 text-xs font-bold text-emerald-700 sm:text-sm">{rupiah(t.priceIdr)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
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
