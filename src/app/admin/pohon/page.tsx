import { apiGet, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
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
      <h1 className="text-3xl font-bold pa-hgrad">Kelola Pohon</h1>

      {searchParams.deleted && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Pohon dihapus.
        </p>
      )}
      {searchParams.unggulan === "1" && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Pohon ditandai unggulan — tampil di beranda.
        </p>
      )}
      {searchParams.unggulan === "0" && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Status unggulan dilepas.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {String(searchParams.error)}
        </p>
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
