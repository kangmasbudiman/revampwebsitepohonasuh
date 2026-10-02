import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapAdopsis, type ApiAdopsi } from "@/lib/api";
import AdopsiTable from "@/components/admin/adopsi-table";

export const metadata = { title: "Data Adopsi | Pohon Asuh" };

export default async function DataAdopsiPage({
  searchParams,
}: PageProps<"/admin/adopsi">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let rows: ApiAdopsi[] = [];
  let fetchError = false;
  try {
    rows = mapAdopsis(await apiGet<Record<string, unknown>[]>("adopsilist"));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Data Adopsi</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Seluruh catatan adopsi pohon beserta grafik dana dan total donasi. Filter per lokasi,
        cari, sunting, hapus, cetak QR label pohon, atau ekspor ke CSV.
      </p>

      {sp?.saved && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Perubahan data adopsi tersimpan.
        </p>
      )}
      {sp?.deleted && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Data adopsi dihapus. Pohon tanpa adopsi tersisa otomatis dikembalikan ke tersedia.
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {String(sp.error)}
        </p>
      )}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat data adopsi. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : (
        <AdopsiTable
          rows={rows}
          initialQuery={(Array.isArray(sp?.q) ? sp.q[0] : sp.q) ?? ""}
        />
      )}
    </main>
  );
}
