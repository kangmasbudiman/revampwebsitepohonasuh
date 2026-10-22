import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import {
  apiGet,
  mapLokasi,
  mapPetaPohons,
  type ApiLokasi,
  type ApiPetaPohon,
} from "@/lib/api";
import LokasiTable from "@/components/admin/lokasi-table";

export const metadata = { title: "Data Lokasi | Pohon Asuh" };

export default async function DataLokasiPage({
  searchParams,
}: PageProps<"/admin/lokasi">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let lokasi: ApiLokasi[] = [];
  let pohon: ApiPetaPohon[] = [];
  let fetchError = false;
  try {
    lokasi = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapLokasi);
  } catch {
    fetchError = true;
  }
  try {
    // peta sebaran seluruh pohon (opsional — tabel tetap tampil bila gagal)
    pohon = mapPetaPohons(await apiGet<Record<string, unknown>[]>("pohonmapall"));
  } catch {
    pohon = [];
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Data Lokasi</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Kelola desa/lokasi adopsi: kode sertifikat, kode pohon, wilayah, skema, dan status tampil
        di halaman publik.
      </p>

      {sp?.saved && (
        <SuccessPopup paramKey="saved" title="Tersimpan">
          Perubahan lokasi tersimpan.
        </SuccessPopup>
      )}
      {sp?.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          Lokasi dihapus.
        </SuccessPopup>
      )}
      {sp?.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.error)}
        </SuccessPopup>
      )}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat data lokasi. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : (
        <LokasiTable lokasi={lokasi} pohon={pohon} />
      )}
    </main>
  );
}
