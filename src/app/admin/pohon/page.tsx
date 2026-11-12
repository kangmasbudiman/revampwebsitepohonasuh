import { apiGet, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import Link from "next/link";
import TreeForm from "@/components/admin/tree-form";
import PohonTable from "@/components/admin/pohon-table";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Admin — Kelola Pohon" };

export default async function AdminTreePage(props: PageProps<"/admin/pohon">) {
  await requireAdminLevel();
  const searchParams = await props.searchParams;

  let trees: ApiTree[] = [];
  let desaList: ApiDesa[] = [];
  try {
    trees = mapTrees(await apiGet<Record<string, unknown>[]>("pohonmapall"));
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    // tampilkan tabel kosong di bawah
  }
  const pohonBaru = searchParams.created
    ? trees.find((t) => t.code === String(searchParams.created))
    : undefined;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold pa-hgrad">Kelola Pohon</h1>
        <Link
          href="/admin/pohon/beku"
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-night-800"
        >
          ❄ Pembekuan Pohon
        </Link>
      </div>

      {searchParams.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          Pohon dihapus.
        </SuccessPopup>
      )}
      {searchParams.unggulan === "1" && (
        <SuccessPopup paramKey="unggulan" title="Unggulan Aktif">
          Pohon ditandai unggulan — tampil di beranda.
        </SuccessPopup>
      )}
      {searchParams.unggulan === "0" && (
        <SuccessPopup paramKey="unggulan" title="Unggulan Dilepas">
          Status unggulan dilepas.
        </SuccessPopup>
      )}
      {searchParams.dipesan && (
        <SuccessPopup paramKey="dipesan" title="Pohon Dipesan">
          Pohon berhasil dipesan untuk pemesan tertentu — statusnya kini
          Dipesan Admin dan tidak bisa diadopsi pengunjung.
        </SuccessPopup>
      )}
      {searchParams.dibatalkan && (
        <SuccessPopup paramKey="dibatalkan" title="Pesanan Dibatalkan">
          Reservasi dibatalkan — pohon kembali tersedia untuk umum.
        </SuccessPopup>
      )}
      {searchParams.beku === "1" && (
        <SuccessPopup paramKey="beku" title="Pohon Dibekukan">
          {Number(searchParams.jumlah) || 1} pohon dibekukan — tetap tampil di daftar publik,
          tetapi tidak bisa diadopsi.{" "}
          <Link href="/admin/pohon/beku" className="font-semibold text-emerald-700 underline">
            Menu Pembekuan Pohon
          </Link>
        </SuccessPopup>
      )}
      {searchParams.beku === "0" && (
        <SuccessPopup paramKey="beku" title="Pembekuan Dibuka">
          {Number(searchParams.jumlah) || 1} pohon diaktifkan kembali.
        </SuccessPopup>
      )}
      {searchParams.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(searchParams.error)}
        </SuccessPopup>
      )}

      {searchParams.created && (
        <SuccessPopup
          paramKey="created"
          title="Pohon berhasil ditambahkan"
          subtitle={pohonBaru ? `${pohonBaru.localName} · ${pohonBaru.code}` : String(searchParams.created)}
        >
          Pohon{" "}
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:bg-night-800 dark:text-zinc-200">
            {String(searchParams.created)}
          </span>{" "}
          tersimpan dan langsung tampil di tabel di bawah.
        </SuccessPopup>
      )}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">
          + Tambah Pohon Baru
        </summary>
        <div className="mt-4">
          <TreeForm desas={desaList.map((d) => ({ name: d.name }))} />
        </div>
      </details>

      <PohonTable trees={trees} />
    </main>
  );
}
