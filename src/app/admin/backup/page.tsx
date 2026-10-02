import { requireAdminLevel } from "@/lib/guard";
import { apiGet, backupHeaders, mapBackups, type ApiBackup } from "@/lib/api";
import BackupTable from "@/components/admin/backup-table";

export const metadata = { title: "Backup Database | Pohon Asuh" };

export default async function BackupPage({ searchParams }: PageProps<"/admin/backup">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let files: ApiBackup[] = [];
  let fetchError = false;
  try {
    const res = await apiGet<{ value?: number; files?: Record<string, unknown>[] }>(
      "backuplist",
      backupHeaders(),
    );
    files = mapBackups(res.files ?? []);
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Backup Database</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Buat salinan seluruh database adopsi (.sql.gz), unduh, atau hapus. Backup tersimpan di
        server API (storage/app/backups) — pemulihan dilakukan manual oleh pengelola server.
      </p>

      {sp?.created !== undefined && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Backup berhasil dibuat{sp.created ? `: ${String(sp.created)}` : "."}
        </p>
      )}
      {sp?.deleted && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Backup dihapus.
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {String(sp.error)}
        </p>
      )}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat daftar backup. Periksa koneksi ke server API lalu muat ulang halaman.
        </p>
      ) : (
        <BackupTable files={files} />
      )}
    </main>
  );
}
