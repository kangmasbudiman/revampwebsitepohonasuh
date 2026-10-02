"use client";

// Daftar backup database: tombol buat backup baru (server action),
// unduh (blob dari base64 via server action), hapus (konfirmasi).

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { DatabaseBackup, Download, Loader2, Trash2 } from "lucide-react";
import type { ApiBackup } from "@/lib/api";
import { buatBackup, hapusBackup, unduhBackup } from "@/lib/actions/backup";
import ConfirmSubmit from "@/components/admin/confirm-submit";

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("id-ID")} KB`;
};

function TombolBuat() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
      {pending ? "Membuat backup…" : "Buat Backup Baru"}
    </button>
  );
}

export default function BackupTable({ files }: { files: ApiBackup[] }) {
  const [unduhAktif, setUnduhAktif] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unduh = (name: string) => {
    setPesan(null);
    startTransition(async () => {
      setUnduhAktif(name);
      try {
        const res = await unduhBackup(name);
        const bin = atob(res.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/gzip" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = res.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setPesan(`Gagal mengunduh ${name}. Coba lagi.`);
      } finally {
        setUnduhAktif(null);
      }
    });
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 pa-card px-4 py-3 shadow-sm dark:border-night-700">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-emerald-950 dark:text-emerald-50">
            {files.length.toLocaleString("id-ID")} file backup
          </span>{" "}
          · format .sql.gz (gzip, seluruh tabel)
        </div>
        <form action={buatBackup}>
          <TombolBuat />
        </form>
      </div>

      {pesan && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {pesan}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="px-3 py-3">No</th>
                <th className="px-3 py-3">Nama File</th>
                <th className="px-3 py-3 text-right">Ukuran</th>
                <th className="px-3 py-3">Waktu Dibuat</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {files.map((f, i) => (
                <tr key={f.name} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-3 py-3 text-xs text-zinc-400">{i + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-100">
                    {f.name}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                    {formatSize(f.size)}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{f.tanggal}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => unduh(f.name)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                      >
                        {unduhAktif === f.name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Unduh
                      </button>
                      <form action={hapusBackup}>
                        <input type="hidden" name="file" value={f.name} />
                        <ConfirmSubmit
                          message={`Hapus backup ${f.name}? File tidak dapat dikembalikan.`}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Belum ada backup. Klik “Buat Backup Baru” untuk membuat salinan pertama.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
