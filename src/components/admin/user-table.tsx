"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiMember } from "@/lib/api";
import { updateStatusMember } from "@/lib/actions/member";
import ConfirmSubmit from "@/components/admin/confirm-submit";

const PER_PAGE = 50;

const PERAN_BADGE: Record<number, { label: string; className: string }> = {
  0: { label: "Donatur", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
  1: { label: "Admin", className: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300" },
  2: { label: "Petugas", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
};

type Filter = "semua" | "0" | "1" | "2" | "aktif" | "nonaktif";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "0", label: "Donatur" },
  { value: "1", label: "Admin" },
  { value: "2", label: "Petugas" },
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

export default function UserTable({
  members,
  ownId,
  initialQuery = "",
}: {
  members: ApiMember[];
  ownId: number;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("semua");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (needle && !m.name.toLowerCase().includes(needle) && !m.emaile.toLowerCase().includes(needle) && !m.hp.includes(needle)) {
        return false;
      }
      if (filter === "aktif") return m.aktif;
      if (filter === "nonaktif") return !m.aktif;
      if (filter !== "semua") return String(m.admin) === filter;
      return true;
    });
  }, [members, q, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama / email / HP…"
            className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "pa-btn-primary text-white"
                  : "border border-emerald-200 dark:border-night-700 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-night-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length.toLocaleString("id-ID")} user
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3">Tanggal Daftar</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {rows.map((m) => {
              const peran = PERAN_BADGE[m.admin] ?? PERAN_BADGE[0];
              const sendiri = m.id === ownId;
              return (
                <tr key={m.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800 dark:text-zinc-100">{m.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.emaile || "—"}</p>
                    {m.hp && <p className="text-xs text-zinc-400 dark:text-zinc-500">{m.hp}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${peran.className}`}>
                      {peran.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{m.tanggal ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        m.aktif
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                      }`}
                    >
                      {m.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/user?kirim=${m.id}`}
                      className="mr-2 inline-block rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                    >
                      Kirim Pesan
                    </Link>
                    <form action={updateStatusMember} className="inline">
                      <input type="hidden" name="idmember" value={m.id} />
                      <input type="hidden" name="aktif" value={m.aktif ? "0" : "1"} />
                      <input type="hidden" name="nama" value={m.name} />
                      {m.aktif ? (
                        <ConfirmSubmit
                          message={`Nonaktifkan akun ${m.name}? Akun ini tidak akan bisa login (web & mobile).`}
                          disabled={sendiri}
                          title={sendiri ? "Akun Anda sendiri" : undefined}
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Nonaktifkan
                        </ConfirmSubmit>
                      ) : (
                        <button
                          type="submit"
                          disabled={sendiri}
                          title={sendiri ? "Akun Anda sendiri" : undefined}
                          className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                        >
                          Aktifkan
                        </button>
                      )}
                    </form>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Tidak ada user yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-emerald-100 px-4 py-3 text-sm dark:border-night-700">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Hal {current} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
