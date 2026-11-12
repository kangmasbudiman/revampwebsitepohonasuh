import Link from "next/link";
import { apiGet, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import PembekuanPanel from "@/components/admin/pembekuan-panel";
import PembekuanTable from "@/components/admin/pembekuan-table";

export const metadata = { title: "Admin — Pembekuan Pohon" };

// Menu "Pembekuan Pohon": satu tempat untuk membekukan pohon (tertentu,
// beberapa pohon, atau seluruh pohon tersedia di satu desa) lengkap dengan
// alasan & durasi, serta membuka kembali pembekuan yang aktif.
export default async function PembekuanPohonPage(props: PageProps<"/admin/pohon/beku">) {
  await requireAdminLevel();
  const searchParams = await props.searchParams;

  let trees: ApiTree[] = [];
  let desas: ApiDesa[] = [];
  try {
    trees = mapTrees(await apiGet<Record<string, unknown>[]>("pohonmapall"));
    desas = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    // tampilkan kosong di bawah
  }

  const tersedia = trees
    .filter((t) => t.status === "AVAILABLE" && !t.frozen && !t.reservedAdmin)
    .map((t) => ({ code: t.code, localName: t.localName, desa: t.desa }));
  const frozen = trees.filter((t) => t.frozen);
  const namaDesaList = [...new Set(desas.map((d) => d.name))].sort();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/pohon" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Pohon
      </Link>
      <h1 className="mt-3 text-3xl font-bold pa-hgrad">Pembekuan Pohon</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
        Pohon yang dibekukan tetap tampil di website publik (foto, nama, jenis, dan lokasi),
        tetapi tidak bisa diadopsi sampai pembekuan dibuka — otomatis setelah batas waktu
        (bila dipilih sementara) atau manual oleh admin.
      </p>

      {searchParams.beku === "1" && (
        <SuccessPopup paramKey="beku" title="Pohon Dibekukan">
          {Number(searchParams.jumlah) || 0} pohon dibekukan — tetap tampil di daftar publik,
          tetapi tidak bisa diadopsi.
          {Number(searchParams.lewati) > 0 && (
            <> {Number(searchParams.lewati)} pohon dilewati karena tidak tersedia.</>
          )}
        </SuccessPopup>
      )}
      {searchParams.beku === "0" && (
        <SuccessPopup paramKey="beku" title="Pembekuan Dibuka">
          {Number(searchParams.jumlah) || 0} pohon diaktifkan kembali dan bisa diadopsi.
        </SuccessPopup>
      )}
      {searchParams.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(searchParams.error)}
        </SuccessPopup>
      )}

      <PembekuanPanel desas={namaDesaList} tersedia={tersedia} />
      <PembekuanTable frozen={frozen} />
    </main>
  );
}
