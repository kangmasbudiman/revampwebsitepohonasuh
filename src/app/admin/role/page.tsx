import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import {
  apiGet,
  mapMembers,
  mapRoles,
  type ApiMember,
  type ApiRole,
} from "@/lib/api";
import RoleManager from "@/components/admin/role-manager";

export const metadata = { title: "Kelola Role | Pohon Asuh" };

export default async function KelolaRolePage({
  searchParams,
}: PageProps<"/admin/role">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let roles: ApiRole[] = [];
  let staf: ApiMember[] = [];
  let fetchError = false;
  try {
    roles = mapRoles(await apiGet<Record<string, unknown>[]>("rolelist"));
  } catch {
    fetchError = true;
  }
  try {
    staf = mapMembers(await apiGet<Record<string, unknown>[]>("getmembers")).filter(
      (m) => m.admin >= 1,
    );
  } catch {
    staf = [];
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Kelola Role</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Buat role dengan izin tertentu lalu tempelkan ke staf — misalnya petugas yang boleh
        menerbitkan Memo Pencairan pada Laporan Kegiatan.
      </p>

      {sp?.saved && (
        <SuccessPopup paramKey="saved" title="Tersimpan">
          Perubahan role tersimpan. Berlaku saat staf bersangkutan login ulang.
        </SuccessPopup>
      )}
      {sp?.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          Role dihapus — staf pemakainya kembali tanpa role.
        </SuccessPopup>
      )}
      {sp?.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.error)}
        </SuccessPopup>
      )}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat data role. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : (
        <RoleManager roles={roles} staf={staf} />
      )}
    </main>
  );
}
