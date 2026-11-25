"use client";

import { useState } from "react";
import { requestPesananMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { CalendarDays, MapPin, Sprout, Wallet } from "lucide-react";
import { namaDesa, formatProvinsi, rupiah, tanggal } from "@/lib/format";
import type { ApiDesa, ApiProgramMitra } from "@/lib/api";

// Form pemesanan pohon — Mitra pilih program dulu, lalu lokasi/desa yang
// tersedia dibatasi pada provinsi program tersebut. Detail program tampil
// otomatis; admin yang memilih pohon & memverifikasi pesanan.
export default function MitraPohonOrderForm({
  desas,
  programs,
  existingOrders = [],
}: {
  desas: ApiDesa[];
  programs: ApiProgramMitra[];
  existingOrders?: { id: number; programId: number | null; jumlah: number; jumlahTeradopsi: number; status: string }[];
}) {
  const [programId, setProgramId] = useState<number | null>(null);
  const [desa, setDesa] = useState("");

  const program = programId ? programs.find((p) => p.id === programId) ?? null : null;
  const provinsiList = program
    ? String(program.provinsi ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const desaOptions = desas.filter((d) =>
    provinsiList.includes(String(d.provinsi ?? "").trim().toLowerCase()),
  );

  // Jumlah pohon diambil dari Rincian Anggaran program (fallback data lama).
  const totalPohon = program
    ? program.budgetDetail.length > 0
      ? program.budgetDetail.reduce((s, r) => s + r.qty, 0)
      : program.budget
        ? Math.max(1, Math.round(program.budget / 200000))
        : 0
    : 0;

  const ordersForProgram = program
    ? existingOrders.filter(
        (o) => o.programId === program.id && (o.status === "pending" || o.status === "approved"),
      )
    : [];
  const sudahDipesan = ordersForProgram.reduce((s, o) => s + o.jumlah, 0);
  const sudahDiadopsi = ordersForProgram.reduce((s, o) => s + o.jumlahTeradopsi, 0);
  // Sisa yang bisa dipesan = total pohon program − pohon yang sudah diadopsi.
  const sisa = Math.max(0, totalPohon - sudahDiadopsi);

  return (
    <form action={requestPesananMitra} className="mt-6 space-y-4">
      {/* 1. Pilih program dulu */}
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Program *</span>
          <select
            name="program_id"
            value={programId ?? ""}
            onChange={(e) => {
              setProgramId(e.target.value ? Number(e.target.value) : null);
              setDesa(""); // reset lokasi saat program diganti
            }}
            required
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            <option value="">Pilih program...</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </label>

        {/* 2. Lokasi menyusul, hanya desa di provinsi program */}
        <label className="mt-3 block">
          <span className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <MapPin className="h-4 w-4" /> Lokasi / Desa (opsional)
          </span>
          <select
            name="desa"
            value={desa}
            onChange={(e) => setDesa(e.target.value)}
            disabled={!program}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            <option value="">
              {program ? "Semua lokasi (provinsi program)" : "Pilih program terlebih dahulu"}
            </option>
            {desaOptions.map((d) => (
              <option key={d.id} value={d.name}>
                {d.label || namaDesa(d.name)} ({namaDesa(d.provinsi)})
              </option>
            ))}
          </select>
          {program && provinsiList.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">Program ini belum memiliki provinsi — semua lokasi ditampilkan.</p>
          )}
        </label>

        <label className="mt-3 block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Catatan (opsional)</span>
          <input
            name="catatan"
            placeholder="mis. minimal diameter 30cm, prioritaskan desa X"
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
        </label>
      </div>

      {/* Detail program otomatis */}
      {program && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-night-700 dark:bg-emerald-950/20">
          <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            Detail Program · {program.nama}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><MapPin className="h-3.5 w-3.5" /> Provinsi</p>
              <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{formatProvinsi(program.provinsi)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Sprout className="h-3.5 w-3.5" /> Jumlah Pohon</p>
              <p className="mt-1 text-sm font-bold text-emerald-700">{totalPohon}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Sudah dipesan: {sudahDipesan} · Sudah diadopsi: {sudahDiadopsi} · Sisa: {sisa}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><CalendarDays className="h-3.5 w-3.5" /> Masa Program</p>
              <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-100">
                {program.tglMulai ? tanggal(program.tglMulai) : "—"} → {program.tglSelesai ? tanggal(program.tglSelesai) : "—"}
              </p>
              {program.durasi && <p className="mt-0.5 text-[11px] text-zinc-500">{program.durasi}</p>}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><Wallet className="h-3.5 w-3.5" /> Total Budget</p>
              <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{rupiah(program.budget ?? 0)}</p>
            </div>
            {ordersForProgram.length > 0 && (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Pesanan sebelumnya untuk program ini</p>
                <ul className="mt-2 space-y-1.5">
                  {ordersForProgram.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="font-mono font-semibold text-emerald-700">#{o.id}</span>
                      <span>{o.status === "approved" ? "Disetujui" : o.status === "pending" ? "Menunggu" : o.status === "rejected" ? "Ditolak" : o.status === "cancelled" ? "Dibatalkan" : o.status}</span>
                      <span>{o.jumlah} pohon</span>
                      <span className="text-zinc-400">· sisa {Math.max(0, o.jumlah - o.jumlahTeradopsi)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kirim — jumlah pohon otomatis dari sisa program */}
      <input type="hidden" name="jumlah" value={sisa > 0 ? sisa : 0} />
      <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Jumlah pohon yang akan dipesan</span>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {sisa > 0
                ? `Otomatis dari sisa program (${sisa} pohon) — admin akan memilih pohon tersedia.`
                : "Sisa pohon program 0 — tidak bisa memesan lagi."}
            </p>
          </div>
          <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
            {sisa || "—"}
          </span>
        </div>
        <SubmitButton
          pendingLabel="Mengirim pesanan…"
          disabled={!program || sisa < 1}
          className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Kirim Permintaan Pemesanan
        </SubmitButton>
      </div>
    </form>
  );
}
