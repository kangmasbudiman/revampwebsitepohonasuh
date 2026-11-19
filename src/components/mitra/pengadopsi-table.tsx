"use client";

// Tabel "Data Pengadopsi" halaman Laporan Mitra — filter pertanggal (dari–
// sampai), per program, per status verifikasi + pencarian teks + export CSV
// sesuai hasil filter.

import { useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Search, Download } from "lucide-react";
import type { ApiProgramMitra } from "@/lib/api";

type Row = Record<string, unknown>;

const csvEscape = (v: string | null | undefined) => {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function PengadopsiTable({
  adopsi,
  programs,
}: {
  adopsi: Row[];
  programs: ApiProgramMitra[];
}) {
  const [q, setQ] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [program, setProgram] = useState("semua");
  const [status, setStatus] = useState<"semua" | "terverifikasi" | "pending">("semua");

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p.nama])), [programs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return adopsi.filter((a) => {
      const cert = String(a.certnum ?? "").trim();
      if (status === "terverifikasi" && cert === "") return false;
      if (status === "pending" && cert !== "") return false;
      if (program !== "semua" && String(a.program_id ?? "0") !== program) return false;
      const tgl = String(a.tgl_adopt ?? "").slice(0, 10);
      if (dari && tgl && tgl < dari) return false;
      if (sampai && tgl && tgl > sampai) return false;
      if (needle) {
        const hay = [
          a.nama, a.email, a.idpohon, a.certnum, a.desa,
          programById.get(Number(a.program_id ?? 0)) ?? "",
        ].map((v) => String(v ?? "").toLowerCase()).join(" ");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [adopsi, q, dari, sampai, program, status, programById]);

  const exportCsv = () => {
    const header = "Program,Nama Pengadopsi,Email,ID Pohon,Certnum,Tgl Adopt";
    const lines = filtered.map((a) => {
      const progNama = programById.get(Number(a.program_id ?? 0)) ?? "";
      return [
        csvEscape(progNama),
        csvEscape(String(a.nama ?? "")),
        csvEscape(String(a.email ?? "")),
        csvEscape(String(a.idpohon ?? "")),
        csvEscape(String(a.certnum ?? "")),
        csvEscape(String(a.tgl_adopt ?? "")),
      ].join(",");
    });
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-pengadopsi.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setQ(""); setDari(""); setSampai(""); setProgram("semua"); setStatus("semua");
  };

  const adaFilter = q || dari || sampai || program !== "semua" || status !== "semua";

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
        <div>
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Data Pengadopsi</h2>
          <p className="text-[11px] text-zinc-500">
            Menampilkan <strong>{filtered.length}</strong> dari {adopsi.length} baris
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden /> Export CSV ({filtered.length})
        </button>
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-2 gap-2 border-b border-emerald-50 bg-emerald-50/30 px-4 py-3 dark:border-night-800 dark:bg-night-800/30 sm:grid-cols-3 lg:grid-cols-6">
        <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / email / pohon / cert…"
            aria-label="Cari pengadopsi"
            className="w-full rounded-xl border border-emerald-100 bg-white py-2 pr-3 pl-9 text-xs outline-none placeholder:text-zinc-400 focus:border-emerald-300 dark:border-night-700 dark:bg-night-950"
          />
        </div>
        <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} aria-label="Dari tanggal" className="rounded-xl border border-emerald-100 bg-white px-2.5 py-2 text-xs outline-none focus:border-emerald-300 dark:border-night-700 dark:bg-night-950" />
        <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} aria-label="Sampai tanggal" className="rounded-xl border border-emerald-100 bg-white px-2.5 py-2 text-xs outline-none focus:border-emerald-300 dark:border-night-700 dark:bg-night-950" />
        <div className="relative">
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            aria-label="Filter program"
            className="w-full appearance-none rounded-xl border border-emerald-100 bg-white py-2 pr-7 pl-2.5 text-xs outline-none focus:border-emerald-300 dark:border-night-700 dark:bg-night-950"
          >
            <option value="semua">Semua Program</option>
            {programs.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.nama}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              aria-label="Filter status"
              className="w-full appearance-none rounded-xl border border-emerald-100 bg-white py-2 pr-7 pl-2.5 text-xs outline-none focus:border-emerald-300 dark:border-night-700 dark:bg-night-950"
            >
              <option value="semua">Semua Status</option>
              <option value="terverifikasi">Terverifikasi</option>
              <option value="pending">Pending Verifikasi</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" aria-hidden />
          </div>
          {adaFilter && (
            <button type="button" onClick={reset} title="Reset filter" aria-label="Reset filter" className="shrink-0 rounded-xl border border-emerald-100 bg-white p-2 text-zinc-500 hover:text-emerald-700 dark:border-night-700 dark:bg-night-950">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">Pengadopsi</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">ID Pohon</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Durasi</th>
              <th className="px-4 py-3">Tgl Adopt</th>
              <th className="px-4 py-3">Sertifikat</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {filtered.map((a, i) => {
              const cert = String(a.certnum ?? "");
              const verified = cert !== "";
              const progNama = programById.get(Number(a.program_id ?? 0)) ?? "—";
              return (
                <tr key={i} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-4 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">{String(a.nama ?? "")}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{String(a.email ?? "—")}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{String(a.idpohon ?? "")}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{progNama}</td>
                  <td className="px-4 py-2.5 text-xs">{String(a.dur ?? "1")} th</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{String(a.tgl_adopt ?? "—")}</td>
                  <td className="px-4 py-2.5 text-xs">{verified ? cert : "—"}</td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{verified ? "Terverifikasi" : "Pending Veri"}</span></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-500">Tidak ada data cocok dengan filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
