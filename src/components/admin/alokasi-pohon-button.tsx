"use client";

import { useEffect, useMemo, useState } from "react";
import { approvePesananMitra, gantiAlokasiPohon } from "@/lib/actions/mitra";
import { namaDesa, rupiah } from "@/lib/format";
import { Search } from "lucide-react";

type Tree = {
  idpohon: string;
  localName?: string;
  localname?: string;
  species?: string | null;
  desa: string;
  provinsi?: string | null;
  diameterCm?: number | null;
  heightM?: number | null;
  harga?: number | string | null;
  foto_pohon?: string | null;
  sedang_dipilih?: boolean;
};

export default function AlokasiPohonButton({
  id,
  jumlah,
  programId,
  desa,
  mode = "approve",
  assetOrigin = "",
}: {
  id: number;
  jumlah: number;
  programId: number | null;
  desa?: string | null;
  mode?: "approve" | "ganti";
  assetOrigin?: string;
}) {
  const isGanti = mode === "ganti";
  const action = isGanti ? gantiAlokasiPohon : approvePesananMitra;
  const [open, setOpen] = useState(false);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [provinsi, setProvinsi] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({
          program_id: programId ? String(programId) : "",
          desa: desa ?? "",
          pesanan_id: String(id),
        });
        const res = await fetch(`/api/admin/pohon-tersedia?${qs.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: Tree[]; provinsi?: string[] };
        if (!cancel) {
          const list = Array.isArray(json.data) ? json.data : [];
          setTrees(list);
          setProvinsi(Array.isArray(json.provinsi) ? json.provinsi : []);
          setPicked(list.filter((t) => t.sedang_dipilih).map((t) => t.idpohon));
        }
      } catch {
        if (!cancel) setTrees([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, programId, desa, id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = trees;
    if (priceFilter !== null) list = list.filter((t) => Number(t.harga ?? 0) === priceFilter);
    if (needle) list = list.filter((t) =>
      [t.idpohon, t.localName ?? t.localname ?? "", t.species ?? "", t.desa ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
    return list;
  }, [trees, query, priceFilter]);

  const toggle = (code: string) => {
    setPicked((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= jumlah) return prev;
      return [...prev, code];
    });
  };

  const penuh = picked.length >= jumlah;

  const submitLabel = isGanti
    ? "Simpan Pilihan Pohon"
    : picked.length === 0
      ? "Setujui & Alokasikan Otomatis"
      : `Setujui & Alokasikan (${picked.length})`;

  const renderPhoto = (t: Tree) => {
    const fotoRaw = t.foto_pohon ? String(t.foto_pohon).trim() : "";
    if (!fotoRaw) return null;
    if (/^https?:\/\//i.test(fotoRaw)) return fotoRaw;
    return `${assetOrigin}/assets/${fotoRaw.replace(/^\/?(assets\/)?/, "")}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mr-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        {isGanti ? "Atur Pohon" : "Setujui & Alokasikan"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Pilih pohon untuk dialokasikan">
          <button type="button" className="absolute inset-0 cursor-default bg-black/55" onClick={() => setOpen(false)} aria-label="Tutup popup" />
          <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-night-900">
            <div className="border-b border-emerald-100 px-5 py-4 dark:border-night-700">
              <h3 className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100">
                {isGanti ? "Atur Pohon" : "Pilih Pohon"} — Pesanan #{id}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Pilih {jumlah} pohon{provinsi.length > 0 ? ` di provinsi ${provinsi.join(", ")}` : " yang tersedia"}. Terpilih: <strong>{picked.length}{isGanti ? "" : `/${jumlah}`}</strong>
                {penuh && <span className="ml-1 font-semibold text-amber-600">— kuota penuh, lepas pilihan untuk mengganti</span>}
              </p>
              <label className="relative mt-3 block">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari kode / nama pohon / desa…"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                  aria-label="Cari pohon"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setPriceFilter(null)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${priceFilter === null ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-zinc-300"}`}>
                  Semua
                </button>
                {[100000, 150000, 200000].map((price) => {
                  const count = trees.filter((t) => Number(t.harga ?? 0) === price).length;
                  return (
                    <button key={price} type="button" onClick={() => setPriceFilter(price)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${priceFilter === price ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-zinc-300"}`}>
                      Rp {price.toLocaleString("id-ID")} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[180px] flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="py-10 text-center text-sm text-zinc-500">Memuat pohon tersedia…</p>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  {trees.length === 0
                    ? "Tidak ada pohon tersedia di provinsi program. Anda tetap bisa menyetujui untuk alokasi otomatis dari desa yang diminta."
                    : "Tidak ada pohon cocok dengan pencarian."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((t) => {
                    const on = picked.includes(t.idpohon);
                    const photo = renderPhoto(t);
                    return (
                      <label
                        key={t.idpohon}
                        className={`flex items-center gap-2.5 rounded-xl border p-2 text-xs transition ${on ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 dark:bg-emerald-950/30" : penuh ? "cursor-not-allowed border-zinc-200 opacity-50 dark:border-night-700" : "cursor-pointer border-zinc-200 hover:border-emerald-300 dark:border-night-700"}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!on && penuh}
                          onChange={() => toggle(t.idpohon)}
                          className="h-4 w-4 shrink-0 accent-emerald-600 disabled:cursor-not-allowed"
                          aria-label={`Pilih ${t.idpohon}`}
                        />
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                          {photo ? (
                            <img src={photo} alt={t.localName ?? t.idpohon} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-lg">🌳</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1">
                            <span className="truncate font-bold text-emerald-950 dark:text-emerald-100">{t.localName ?? t.localname ?? "Pohon"}</span>
                            {t.sedang_dipilih && (
                              <span className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Sudah terpilih</span>
                            )}
                          </span>
                          <span className="block font-mono text-[10px] text-zinc-500">{t.idpohon} · {namaDesa(t.desa)}</span>
                          <span className="block text-[10px] text-zinc-500">{t.provinsi ? namaDesa(t.provinsi) : ""}</span>
                          <span className="block font-semibold text-emerald-700">{rupiah(Number(t.harga ?? 0))}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-emerald-100 px-5 py-4 dark:border-night-700">
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {picked.length > 0 && [100000, 150000, 200000].map((price) => {
                  const n = picked.filter((code) => trees.find((t) => t.idpohon === code && Number(t.harga ?? 0) === price)).length;
                  if (n === 0) return null;
                  return (
                    <span key={price} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
                      Rp {price.toLocaleString("id-ID")}: {n} pohon
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 dark:border-night-700 dark:text-zinc-300">Batal</button>
                <form action={action}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name={isGanti ? "kode_pohon" : "pohon_pilihan_admin"} value={picked.join(",")} />
                  <button
                    type="submit"
                    disabled={isGanti ? picked.length !== jumlah : picked.length > 0 && picked.length !== jumlah}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitLabel}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
