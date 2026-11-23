"use client";

import { useEffect, useState } from "react";
import { approvePesananMitra, gantiAlokasiPohon } from "@/lib/actions/mitra";
import { namaDesa } from "@/lib/format";

type Tree = {
  idpohon: string;
  localName?: string;
  localname?: string;
  species?: string | null;
  desa: string;
  diameterCm?: number | null;
};

// Tombol "Setujui & Alokasikan" — admin memilih pohon dari provinsi program.
export default function AlokasiPohonButton({
  id,
  jumlah,
  programId,
  desa,
  mode = "approve",
}: {
  id: number;
  jumlah: number;
  programId: number | null;
  desa?: string | null;
  mode?: "approve" | "ganti";
}) {
  const isGanti = mode === "ganti";
  const action = isGanti ? gantiAlokasiPohon : approvePesananMitra;
  const [open, setOpen] = useState(false);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [provinsi, setProvinsi] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams({
          program_id: programId ? String(programId) : "",
          desa: desa ?? "",
        });
        const res = await fetch(`/api/admin/pohon-tersedia?${qs.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: Tree[]; provinsi?: string[] };
        if (!cancel) {
          setTrees(Array.isArray(json.data) ? json.data : []);
          setProvinsi(Array.isArray(json.provinsi) ? json.provinsi : []);
        }
      } catch {
        if (!cancel) setTrees([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, programId, desa]);

  const toggle = (code: string) => {
    setPicked((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= jumlah) return prev;
      return [...prev, code];
    });
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
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-night-900">
            <div className="border-b border-emerald-100 px-5 py-4 dark:border-night-700">
              <h3 className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100">
                {isGanti ? "Atur Pohon —" : "Pilih Pohon —"} Pesanan #{id}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Pilih <strong>{jumlah}</strong> pohon{provinsi.length > 0 ? ` di provinsi ${provinsi.join(", ")}` : " yang tersedia"}. Terpilih: <strong>{picked.length}/{jumlah}</strong>
              </p>
            </div>

            <div className="min-h-[160px] flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="py-10 text-center text-sm text-zinc-500">Memuat pohon tersedia…</p>
              ) : trees.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">Tidak ada pohon tersedia di provinsi program. Anda tetap bisa menyetujui untuk alokasi otomatis dari desa yang diminta.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {trees.map((t) => {
                    const on = picked.includes(t.idpohon);
                    return (
                      <label key={t.idpohon} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${on ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-zinc-200 dark:border-night-700"}`}>
                        <input type="checkbox" checked={on} onChange={() => toggle(t.idpohon)} className="h-4 w-4 accent-emerald-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-emerald-950 dark:text-emerald-100">{t.localName ?? t.localname ?? "Pohon"}</span>
                          <span className="font-mono text-[11px] text-zinc-500">{t.idpohon} · {namaDesa(t.desa)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-emerald-100 px-5 py-4 dark:border-night-700">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 dark:border-night-700 dark:text-zinc-300">Batal</button>
              <form action={action}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name={isGanti ? "kode_pohon" : "pohon_pilihan_admin"} value={picked.join(",")} />
                <button
                  type="submit"
                  disabled={!isGanti && picked.length > 0 && picked.length !== jumlah}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGanti ? "Simpan Pilihan Pohon" : `Setujui & Alokasikan${picked.length ? ` (${picked.length})` : " Otomatis"}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
