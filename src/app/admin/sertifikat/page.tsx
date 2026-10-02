import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapSertifikatRows, type ApiSertifikatRow } from "@/lib/api";
import SertifikatTable from "@/components/admin/sertifikat-table";

export const metadata = { title: "Kelola Sertifikat | Pohon Asuh" };

export default async function KelolaSertifikatPage({
  searchParams,
}: PageProps<"/admin/sertifikat">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let rows: ApiSertifikatRow[] = [];
  let fetchError = false;
  try {
    rows = mapSertifikatRows(await apiGet<Record<string, unknown>[]>("allcertificate"));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Kelola Sertifikat</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Seluruh sertifikat adopsi yang telah terbit. Klik "Lihat / Cetak" untuk membuka halaman
        sertifikat resmi yang siap dicetak atau disimpan sebagai PDF.
      </p>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat daftar sertifikat. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : (
        <SertifikatTable
          rows={rows}
          initialQuery={(Array.isArray(sp?.q) ? sp.q[0] : sp?.q) ?? ""}
        />
      )}
    </main>
  );
}
