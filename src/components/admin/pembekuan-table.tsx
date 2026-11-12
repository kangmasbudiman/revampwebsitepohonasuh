"use client";

import { useMemo, useState } from "react";
import { Search, Sun } from "lucide-react";
import type { ApiTree } from "@/lib/api";
import { namaDesa, tampilanStatusTree } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import { unfreezeTrees } from "@/lib/actions/tree";
import SubmitButton from "@/components/admin/submit-button";

// Daftar pohon yang sedang dibekukan + pembukaan pembekuan (satu / beberapa).
// Untuk pengelola desa (bisaBuka=false) tabel hanya menampilkan status.
export default function PembekuanTable({
  frozen,
  bisaBuka = true,
}: {
  frozen: ApiTree[];
  bisaBuka?: boolean;
}) {
  const [q, setQ] = useState("");
  const [hal, setHal] = useState(1);
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());

  const PER_HAL = 20;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return frozen.filter(
      (t) =>
        !needle ||
        t.code.toLowerCase().includes(needle) ||
        t.localName.toLowerCase().includes(needle) ||
        t.desa.toLowerCase().includes(needle) ||
        (t.frozenReason?.toLowerCase().includes(needle) ?? false),
    );
  }, [frozen, q]);

  // Paginasi klien: 20 baris per halaman agar tak scroll panjang.
  const totalHal = Math.max(1, Math.ceil(filtered.length / PER_HAL));
  const halAman = Math.min(hal, totalHal);
  const mulai = (halAman - 1) * PER_HAL;
  const barisHalaman = filtered.slice(mulai, mulai + PER_HAL);

  // Nomor halaman tampil: maks 5 tombol dengan jendela di sekitar halaman aktif.
  const nomorHalaman = useMemo(() => {
    if (totalHal <= 5) return Array.from({ length: totalHal }, (_, i) => i + 1);
    const awal = Math.max(1, Math.min(halAman - 2, totalHal - 4));
    return Array.from({ length: 5 }, (_, i) => awal + i);
  }, [totalHal, halAman]);

  const semuaTerpilih = filtered.length > 0 && filtered.every((t) => terpilih.has(t.code));

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
      if (semuaTerpilih) filtered.forEach((t) => next.delete(t.code));
      else filtered.forEach((t) => next.add(t.code));
      return next;
    });
  };

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-emerald-950 dark:text-zinc-100">
          Pohon Sedang Dibekukan ({frozen.length})
        </h2>
        {bisaBuka && terpilih.size > 0 && (
          <form action={unfreezeTrees}>
            <input type="hidden" name="balik" value="/admin/pohon/beku" />
            {[...terpilih].map((c) => (
              <input key={c} type="hidden" name="idpohon" value={c} />
            ))}
          <SubmitButton
            icon={Sun}
            pendingLabel="Membuka pembekuan…"
            className="pa-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          >
            Buka Pembekuan ({terpilih.size})
          </SubmitButton>
          </form>
        )}
      </div>

      <div className="relative mt-3 max-w-sm">
        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHal(1);
          }}
          aria-label="Cari pohon dibekukan"
          placeholder="Cari kode / nama / desa / alasan…"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        />
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
              <tr>
                {bisaBuka && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua pohon dibekukan"
                      checked={semuaTerpilih}
                      onChange={pilihSemua}
                      className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
                    />
                  </th>
                )}
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Pohon</th>
                <th className="px-4 py-3 font-semibold">Lokasi</th>
                <th className="px-4 py-3 font-semibold">Alasan</th>
                <th className="px-4 py-3 font-semibold">Berlaku s.d.</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {barisHalaman.map((t) => (
                <tr key={t.code} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  {bisaBuka && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${t.code}`}
                        checked={terpilih.has(t.code)}
                        onChange={() => toggle(t.code)}
                        className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                    {t.code}
                  </td>
                  <td className="px-4 py-3 text-zinc-800 dark:text-zinc-100">{t.localName}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{namaDesa(t.desa)}</td>
                  <td className="max-w-[240px] px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    <StatusBadge {...tampilanStatusTree(t)} />
                    {t.frozenReason && (
                      <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">{t.frozenReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {t.frozenUntil ?? "Dibuka manual"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {bisaBuka ? (
                      <form action={unfreezeTrees}>
                        <input type="hidden" name="idpohon" value={t.code} />
                        <input type="hidden" name="balik" value="/admin/pohon/beku" />
                        <SubmitButton
                          icon={Sun}
                          pendingLabel="Memproses…"
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                        >
                          Buka Pembekuan
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">menunggu admin</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={bisaBuka ? 7 : 5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    {frozen.length === 0
                      ? "Tidak ada pohon yang sedang dibekukan."
                      : "Tidak ada pohon yang cocok dengan pencarian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalHal > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Menampilkan {mulai + 1}–{Math.min(mulai + PER_HAL, filtered.length)} dari{" "}
            {filtered.length} pohon
          </p>
          <nav className="flex items-center gap-1" aria-label="Paginasi tabel dibekukan">
            <button
              type="button"
              onClick={() => setHal(halAman - 1)}
              disabled={halAman <= 1}
              className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              ‹ Sebelumnya
            </button>
            {nomorHalaman.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setHal(n)}
                aria-current={n === halAman ? "page" : undefined}
                className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  n === halAman
                    ? "pa-btn-primary text-white"
                    : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHal(halAman + 1)}
              disabled={halAman >= totalHal}
              className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              Berikutnya ›
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
