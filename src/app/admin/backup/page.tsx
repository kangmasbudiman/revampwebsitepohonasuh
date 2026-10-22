import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
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
        <SuccessPopup paramKey="created" title="Backup Dibuat">
          Backup berhasil dibuat{sp.created ? `: ${String(sp.created)}` : "."}
        </SuccessPopup>
      )}
      {sp?.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          Backup dihapus.
        </SuccessPopup>
      )}
      {sp?.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.error)}
        </SuccessPopup>
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
