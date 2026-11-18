"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { inputAdopsiMitra, inputAdopsiMitraSelf } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { type ProgramTreeMini } from "@/components/program-adopsi-pohon-list";
import { Trash2, Plus } from "lucide-react";
import { namaDesa, rupiah } from "@/lib/format";

type Adopter = {
  id: string;
  nama: string;
  email: string;
  dur: number;
  tgl_adopt: string;
  memo: string;
};

const ASSET_ORIGIN = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

export default function MitraAdopsiKonsepForm({
  mitras,
  programs = [],
  selfMode = false,
}: {
  mitras: { id: number; nama: string }[];
  programs?: { id: number; nama: string; mitraId: number }[];
  selfMode?: boolean;
}) {
  const formAction = selfMode ? inputAdopsiMitraSelf : inputAdopsiMitra;
  const [mitraId, setMitraId] = useState(mitras[0]?.id ?? 0);
  const [programId, setProgramId] = useState(0);
  const [adopters, setAdopters] = useState<Adopter[]>([]);
  const [draft, setDraft] = useState({ nama: "", email: "", dur: 1, tgl_adopt: "", memo: "" });
  const [treeList, setTreeList] = useState<ProgramTreeMini[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({}); // idpohon -> adopterId
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch pohon saat ganti program (async) — cancelled flag menghindarkan pembaruan stale
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!programId) {
        if (!cancelled) { setTreeList([]); setChosen({}); }
        return;
      }
      if (!cancelled) { setTreeList([]); setChosen({}); }
      try {
        const res = await fetch(`/api/program-pohon?program_id=${programId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const items: ProgramTreeMini[] = Array.isArray(json?.data) ? (json.data as ProgramTreeMini[]) : [];
        setTreeList(items.filter((t) => t.status === "reserved"));
      } catch {
        if (!cancelled) setTreeList([]);
      }
    })();
    return () => { cancelled = true; };
  }, [programId]);

  // Validasi email sederhana
  const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

  const addAdopter = () => {
    const nama = draft.nama.trim();
    const email = draft.email.trim().toLowerCase();
    if (nama.length < 3 || !emailOk(email)) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setAdopters((prev) => [...prev, { id, nama, email, dur: Math.max(1, draft.dur || 1), tgl_adopt: draft.tgl_adopt || today, memo: draft.memo.trim() }]);
    setDraft({ nama: "", email: "", dur: 1, tgl_adopt: "", memo: "" });
  };

  const removeAdopter = (id: string) => {
    setAdopters((prev) => prev.filter((a) => a.id !== id));
    // lepas penugasan pohon yang terhubung dengan pengadopsi itu
    setChosen((prev) => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== id)));
  };

  const togglePohon = (code: string) => {
    setChosen((prev) => {
      if (prev[code]) {
        const next = { ...prev };
        delete next[code];
        return next;
      }
      // default assigned ke pengadopsi pertama, kalau ada
      const first = adopters[0]?.id;
      return first ? { ...prev, [code]: first } : prev;
    });
  };

  const assignPohon = (code: string, adopterId: string) => {
    setChosen((prev) => ({ ...prev, [code]: adopterId }));
  };

  const itemsJson = useMemo(() => {
    const list = Object.entries(chosen)
      .map(([idpohon, adopterId]) => {
        const a = adopters.find((x) => x.id === adopterId);
        if (!a) return null;
        return { idpohon, nama: a.nama, email: a.email, dur: a.dur, tgl_adopt: a.tgl_adopt, memo: a.memo };
      })
      .filter(Boolean);
    return JSON.stringify(list);
  }, [chosen, adopters]);

  const pilihanPohonCount = Object.keys(chosen as Record<string, string>).length;
  const assignedCount = Object.values(chosen).filter(Boolean).length;

  const selectedProgram = programs.find((p) => p.id === programId);

  return (
    <form ref={formRef} action={formAction} encType="multipart/form-data" className="space-y-6">
      <input type="hidden" name="mitra_id" value={mitraId} />
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="items" value={itemsJson} />

      {/* 2 kolom — gaya "Petugas & Desa | Order Tagging" */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* KOLOM KIRI — mitra + program + data pengadopsi */}
        <div className="space-y-6 xl:col-span-2">
          {/* Mitra (mode admin) */}
          {!selfMode && (
            <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mitra</label>
              <select value={mitraId} onChange={(e) => { setMitraId(Number(e.target.value)); setProgramId(0); }} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
                {mitras.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>
          )}

          {/* Pilih program */}
          <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Program (opsional)</span>
              {selectedProgram && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{adopters.length} pengadopsi · {pilihanPohonCount} pohon dipilih</span>
              )}
            </label>
            <select value={programId} onChange={(e) => { setProgramId(Number(e.target.value)); setChosen({}); setTreeList([]); }} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
              <option value={0}>— Tanpa program —</option>
              {programs.filter((p) => p.mitraId === mitraId).map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          {/* Langkah 1 — Data Pengadopsi */}
          <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
            <h3 className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">1</span>Data Pengadopsi
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">Isi nama & email orang yang mengadopsi dulu. Satu orang bisa mengadopsi banyak pohon.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Nama Pengadopsi</span>
                <input value={draft.nama} onChange={(e) => setDraft({ ...draft, nama: e.target.value })} placeholder="mis. Budi Santoso" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Email Pengadopsi</span>
                <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="mis. budi@email.com" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Durasi Adopsi (tahun)</span>
                <input type="number" min={1} max={10} value={draft.dur} onChange={(e) => setDraft({ ...draft, dur: Number(e.target.value) || 1 })} placeholder="mis. 1" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
                <span className="mt-1 block text-[10px] text-zinc-400">Berapa lama pohon diadopsi</span>
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tanggal Adopsi</span>
                <input type="date" value={draft.tgl_adopt} onChange={(e) => setDraft({ ...draft, tgl_adopt: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
                <span className="mt-1 block text-[10px] text-zinc-400">Tanggal pohon resmi diadopsi</span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Pesan / Memo <span className="font-normal normal-case text-zinc-400">(opsional)</span></span>
                <input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} placeholder="mis. hadiah ultah untuk kampung, memo untuk pengadopsi" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              </label>
            </div>
            <button type="button" onClick={addAdopter} disabled={!draft.nama.trim() || !emailOk(draft.email)} className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-night-700 dark:text-emerald-300">
              <Plus className="h-4 w-4" aria-hidden />Tambah Pengadopsi
            </button>

            {adopters.length > 0 && (
              <ul className="mt-3 space-y-2">
                {adopters.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-night-700 dark:bg-night-800/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-emerald-950 dark:text-emerald-100">{a.nama}</p>
                      <p className="truncate text-[11px] text-zinc-500">{a.email}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{a.dur} thn{a.tgl_adopt ? ` · ${a.tgl_adopt}` : ""}{a.memo ? ` · ${a.memo}` : ""}</p>
                    </div>
                    <button type="button" onClick={() => removeAdopter(a.id)} aria-label="Hapus pengadopsi" className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 dark:hover:bg-night-800">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* KOLOM KANAN — pohon yang diadopsi */}
        <div className="xl:col-span-3 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3 dark:border-night-700">
            <h3 className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">2</span>Pohon yang Diadopsi
            </h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{pilihanPohonCount} pohon dipilih · {assignedCount} ditugaskan</span>
          </div>

          {!programId ? (
            <p className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 px-4 py-6 text-center text-xs text-zinc-500">Pilih program dulu untuk melihat pohon di dalamnya.</p>
          ) : treeList.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 px-4 py-6 text-center text-xs text-zinc-500">Belum ada pohon tersedia (belum diadopsi) di program ini.</p>
          ) : (
            <>
              <p className="mt-2 text-[11px] text-zinc-500">Centang pohon → pilih pengadopsinya dari dropdown. Satu pengadopsi bisa mengadopsi banyak pohon.</p>
              <ul className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {treeList.map((t) => {
                  const picked = !!chosen[t.idpohon];
                  const adopterId = chosen[t.idpohon] ?? "";
                  return (
                    <li key={t.idpohon} className={`flex items-center gap-2 sm:gap-3 rounded-xl border p-2 transition ${picked ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200" : "border-emerald-100 bg-white hover:border-emerald-200 dark:bg-night-900 dark:hover:border-night-600"}`}>
                      <label className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">
                        <input type="checkbox" checked={picked} onChange={() => togglePohon(t.idpohon)} className="h-5 w-5 accent-emerald-600" aria-label={`Pilih ${t.idpohon}`} />
                      </label>
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-emerald-50 sm:h-16 sm:w-16">
                        {t.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.photoUrl.startsWith("http") ? t.photoUrl : `${ASSET_ORIGIN}/${t.photoUrl.replace(/^\//, "")}`} alt={t.localName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-xl">🌳</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs font-bold text-emerald-950 dark:text-emerald-100">{t.localName}</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-800 dark:bg-night-800 dark:text-emerald-300">{t.idpohon}</span>
                          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-bold text-amber-900">Dipesan</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{namaDesa(t.desa)}{t.diameterCm ? ` · Ø ${t.diameterCm} cm` : ""}{t.heightM ? ` · T ${t.heightM} m` : ""}</p>
                        <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{rupiah(t.harga ?? 0)}</p>
                      </div>
                      {picked ? (
                        <select value={adopterId} onChange={(e) => assignPohon(t.idpohon, e.target.value)} className="shrink-0 rounded-lg border border-emerald-200 bg-white px-2 py-2 text-[10px] font-semibold text-emerald-900 dark:border-night-700 dark:bg-night-950 dark:text-emerald-300 sm:max-w-[150px]">
                          <option value="">—Pilih pengadopsi—</option>
                          {adopters.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
                        </select>
                      ) : adopters.length > 0 ? (
                        <span className="shrink-0 hidden text-[10px] text-zinc-400 sm:inline">Centang dulu</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Submit — lebar penuh */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700">
        <div className="text-xs text-zinc-600 dark:text-zinc-300">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">{pilihanPohonCount} pohon · {adopters.length} pengadopsi</p>
          <p className="mt-0.5 text-[10px] text-zinc-400">{assignedCount} pohon sudah ditugaskan ke pengadopsi</p>
        </div>
        <SubmitButton pendingLabel="Memproses…" disabled={assignedCount === 0} className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
          Simpan {assignedCount} Adopsi
        </SubmitButton>
      </div>
    </form>
  );
}

