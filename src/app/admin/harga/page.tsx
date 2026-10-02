import { requireAdminLevel } from "@/lib/guard";
import {
  apiGet,
  mapLokasi,
  mapPriceRows,
  type ApiLokasi,
  type ApiPriceRow,
} from "@/lib/api";
import HargaTable from "@/components/admin/harga-table";

export const metadata = { title: "Data Harga Pohon | Pohon Asuh" };

export default async function DataHargaPage() {
  await requireAdminLevel();

  let rows: ApiPriceRow[] = [];
  let lokasi: ApiLokasi[] = [];
  let fetchError = false;
  try {
    rows = mapPriceRows(await apiGet<Record<string, unknown>[]>("reportprice"));
    lokasi = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapLokasi);
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Data Harga Pohon</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Jumlah pohon per lokasi dan tier harga (100rb, 150rb, dst.) beserta grafik komposisi
        harga dan status pohon. Saring per status, cari lokasi, atau lihat sebaran per lokasi.
      </p>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat data harga pohon. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : (
        <HargaTable rows={rows} lokasi={lokasi} />
      )}
    </main>
  );
}
