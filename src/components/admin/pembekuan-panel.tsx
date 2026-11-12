"use client";

import { useMemo, useState } from "react";
import { Search, Snowflake } from "lucide-react";
import { freezeTrees } from "@/lib/actions/tree";
import { toggleLokasiBeku } from "@/lib/actions/lokasi";

type TreePilihan = {
  code: string;
  localName: string;
  desa: string;
};

// Panel "Pembekuan Pohon" (menu Pembekuan Pohon): admin memilih target
// (pohon tertentu / beberapa pohon / seluruh pohon tersedia di satu desa),
// mengisi alasan, menentukan durasi, lalu Konfirmasi Pembekuan.
export default function PembekuanPanel({
  desas,
  tersedia,
}: {
  desas: string[];
  tersedia: TreePilihan[];
}) {
  const [mode, setMode] = useState<"pohon" | "desa">("pohon");
  const [desa, setDesa] = useState<string>(desas[0] ?? "");
  const [q, setQ] = useState("");
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());

  const daftar = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tersedia.filter(
      (t) =>
        (desa === "semua" || t.desa === desa) &&
        (!needle ||
          t.code.toLowerCase().includes(needle) ||
          t.localName.toLowerCase().includes(needle)),
    );
  }, [tersedia, desa, q]);

  const semuaTerpilih = daftar.length > 0 && daftar.every((t) => terpilih.has(t.code));

  const toggle = (code: string) => {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const pilihSemua = () => {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (semuaTerpilih) daftar.forEach((t) => next.delete(t.code));
      else daftar.forEach((t) => next.add(t.code));
      return next;
    });
  };

  const selectClass =
    "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

  return (
    <div className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
      <h2 className="font-semibold text-emerald-800 dark:text-emerald-300">
        Bekukan Pohon
      </h2>

      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Target pembekuan">
        {(
          [
            { v: "pohon", l: "Pohon tertentu / beberapa pohon" },
            { v: "desa", l: "Seluruh pohon tersedia di satu desa" },
          ] as const
        ).map((m) => (
          <button
            key={m.v}
            type="button"
            role="radio"
            aria-checked={mode === m.v}
            onClick={() => setMode(m.v)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              mode === m.v
                ? "pa-btn-primary text-white"
                : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            }`}
          >
            {m.l}
          </button>
        ))}
      </div>

      <form
        action={mode === "desa" ? toggleLokasiBeku : freezeTrees}
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        <input type="hidden" name="balik" value="/admin/pohon/beku" />
        {mode === "pohon" &&
          [...terpilih].map((c) => <input key={c} type="hidden" name="idpohon" value={c} />)}
        {mode === "desa" && (
          <>
            <input type="hidden" name="desa" value={desa} />
            <input type="hidden" name="beku" value="yes" />
          </>
        )}

        <div>
          <label htmlFor="pilih-desa" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Lokasi desa
          </label>
          <select
            id="pilih-desa"
            value={desa}
            onChange={(e) => {
              setDesa(e.target.value);
              setTerpilih(new Set());
            }}
            className={`${selectClass} mt-1 w-full`}
          >
            <option value="semua">Semua desa</option>
            {desas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="durasi-beku" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Berlaku
          </label>
          <select id="durasi-beku" name="hari" defaultValue="0" className={`${selectClass} mt-1 w-full`}>
            <option value="0">Sampai dibuka manual oleh admin</option>
            <option value="7">Sementara — 7 hari</option>
            <option value="30">Sementara — 30 hari</option>
            <option value="90">Sementara — 90 hari</option>
          </select>
        </div>

        {mode === "pohon" && (
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cari-pohon-beku" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Pilih pohon ({terpilih.size} dipilih)
              </label>
              {daftar.length > 0 && (
                <button
                  type="button"
                  onClick={pilihSemua}
                  className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  {semuaTerpilih ? "Hapus semua pilihan" : "Pilih semua hasil"}
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
              <input
                id="cari-pohon-beku"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kode / nama pohon…"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              />
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 dark:border-night-700">
              {daftar.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Tidak ada pohon tersedia yang cocok.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-night-800">
                  {daftar.map((t) => (
                    <li key={t.code}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-emerald-50/60 dark:hover:bg-night-800/60">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${t.code}`}
                          checked={terpilih.has(t.code)}
                          onChange={() => toggle(t.code)}
                          className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
                        />
                        <span className="font-mono text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                          {t.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-200">
                          {t.localName}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.desa}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <label htmlFor="alasan-beku" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Alasan pembekuan
          </label>
          <textarea
            id="alasan-beku"
            name="alasan"
            required
            maxLength={255}
            rows={2}
            placeholder="mis. disiapkan untuk program CSR PT Hijau Lestari"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={mode === "pohon" && terpilih.size === 0}
            title={
              mode === "pohon" && terpilih.size === 0
                ? "Pilih minimal satu pohon terlebih dahulu"
                : undefined
            }
            className="pa-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Snowflake aria-hidden className="h-4 w-4" />
            Konfirmasi Pembekuan
          </button>
        </div>
      </form>
    </div>
  );
}
