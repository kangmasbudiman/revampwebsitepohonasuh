"use client";

import { useMemo, useState } from "react";
import { inputAdopsiMitra, inputAdopsiMitraSelf } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import ProgramAdopsiPohonList from "@/components/program-adopsi-pohon-list";

type Item = {
  idpohon: string;
  nama: string;
  email: string;
  dur: number;
  tgl_adopt: string;
  memo: string;
};

function parseCsv(text: string): Item[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const first = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const hasHeader = first.includes("idpohon") || first.includes("kode") || first.includes("code");
  const start = hasHeader ? 1 : 0;
  const idx = (cols: string[], names: string[]) => {
    for (const n of names) {
      const i = cols.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const out: Item[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    // coba deteksi header dinamis
    const iCode = idx(first, ["idpohon", "kode", "code", "id"]);
    const iNama = idx(first, ["nama", "penerima", "adopter", "pengadopsi"]);
    const iDur = idx(first, ["dur", "durasi", "tahun", "years"]);
    const iTgl = idx(first, ["tgl_adopt", "tanggal", "tgl", "date"]);
    const iMemo = idx(first, ["memo", "pesan", "note"]);
    const iEmail = idx(first, ["email", "email_pengadopsi", "email pengadopsi", "emailPengadopsi"]);
    const code = (iCode >= 0 ? cols[iCode] : cols[0]) ?? "";
    if (!code) continue;
    const nama = iNama >= 0 ? cols[iNama] ?? "" : cols[1] ?? "";
    const email = iEmail >= 0 ? (cols[iEmail] ?? "").trim().toLowerCase() : (cols[2] ?? "").trim().toLowerCase();
    const dur = iDur >= 0 ? Number(cols[iDur]) || 1 : Number(cols[3]) || 1;
    const tgl = iTgl >= 0 ? cols[iTgl] ?? "" : cols[4] ?? "";
    const memo = iMemo >= 0 ? cols[iMemo] ?? "" : cols[5] ?? "";
    out.push({ idpohon: code, nama, email, dur: Math.max(1, Math.min(10, dur)), tgl_adopt: tgl, memo });
  }
  return out;
}

export default function MitraAdopsiForm({
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
  const [items, setItems] = useState<Item[]>([]);
  const [csv, setCsv] = useState("");
  const [manual, setManual] = useState<Item>({ idpohon: "", nama: "", email: "", dur: 1, tgl_adopt: "", memo: "" });

  const today = new Date().toISOString().slice(0, 10);

  const tambahManual = () => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(manual.email.trim());
    if (!manual.idpohon.trim() || !manual.nama.trim() || !emailOk) return;
    setItems((prev) => [...prev, { ...manual, email: manual.email.trim().toLowerCase(), dur: manual.dur || 1, tgl_adopt: manual.tgl_adopt || today }]);
    setManual({ idpohon: "", nama: "", email: "", dur: 1, tgl_adopt: "", memo: "" });
  };

  const hapusBaris = (i: number) => setItems((prev) => prev.filter((_, k) => k !== i));

  const handleCsv = () => {
    const parsed = parseCsv(csv);
    if (parsed.length === 0) return;
    setItems((prev) => [...prev, ...parsed.map((p) => ({ ...p, tgl_adopt: p.tgl_adopt || today }))]);
    setCsv("");
  };

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="mitra_id" value={mitraId} />
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="items" value={itemsJson} />

      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mitra</label>
        {selfMode ? (
          <p className="mt-1 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-night-700 dark:bg-night-800">{mitras[0]?.nama}</p>
        ) : (
          <select
            value={mitraId}
            onChange={(e) => setMitraId(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            {mitras.map((m) => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
        )}
          <label className="mt-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Program (opsional)</label>
          <select value={programId} onChange={(e) => setProgramId(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value={0}>— Tanpa program —</option>
            {programs.filter((p) => p.mitraId === mitraId).map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
          <ProgramAdopsiPohonList programId={programId} mitraId={mitraId} />
      </div>

      {!selfMode && (
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">Import CSV</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Kolom: <code>idpohon, nama, email, dur, tgl_adopt, memo</code> (header opsional). Contoh:{" "}
            <code>B092, Bapak Andi, andi@example.com, 2, 2026-11-15, Hadiah</code>
          </p>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            placeholder="B092, Bapak Andi, andi@example.com, 2, 2026-11-15, Hadiah"
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
          <button type="button" onClick={handleCsv} className="mt-2 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
            Tambahkan dari CSV
          </button>
        </div>
      )}

            <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">Input Manual</h3>
        <p className="mt-1 text-[11px] text-zinc-500">Satu pengadopsi bisa mengadopsi banyak pohon — isi nama &amp; email yang sama untuk beberapa kode pohon.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-6">
          <input value={manual.idpohon} onChange={(e) => setManual({ ...manual, idpohon: e.target.value })} placeholder="Kode pohon" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input value={manual.nama} onChange={(e) => setManual({ ...manual, nama: e.target.value })} placeholder="Nama pengadopsi" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input type="email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder="Email pengadopsi" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input type="number" min={1} max={10} value={manual.dur} onChange={(e) => setManual({ ...manual, dur: Number(e.target.value) || 1 })} placeholder="Durasi (thn)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input type="date" value={manual.tgl_adopt} onChange={(e) => setManual({ ...manual, tgl_adopt: e.target.value })} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input value={manual.memo} onChange={(e) => setManual({ ...manual, memo: e.target.value })} placeholder="Memo" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
        </div>
        <button type="button" onClick={tambahManual} className="mt-2 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
          Tambah Baris
        </button>
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
            Preview ({items.length} adopsi)
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Kode Pohon</th>
                  <th className="px-3 py-2 font-semibold">Nama Pengadopsi</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Durasi</th>
                  <th className="px-3 py-2 font-semibold">Tgl Adopt</th>
                  <th className="px-3 py-2 font-semibold">Memo</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs">{it.idpohon}</td>
                    <td className="px-3 py-2">{it.nama}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{it.email}</td>
                    <td className="px-3 py-2">{it.dur} thn</td>
                    <td className="px-3 py-2">{it.tgl_adopt || today}</td>
                    <td className="px-3 py-2 text-zinc-500">{it.memo}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => hapusBaris(i)} className="text-xs text-red-600 hover:underline">hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <SubmitButton pendingLabel="Memproses…" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Input {items.length} Adopsi Mitra
            </SubmitButton>
          </div>
        </div>
      )}
    </form>
  );
}
