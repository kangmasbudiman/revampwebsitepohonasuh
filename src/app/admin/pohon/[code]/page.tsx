import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { apiGet, apiPost, isDefaultTreePhoto, mapDesa, mapTree, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { TREE_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import TreeForm from "@/components/admin/tree-form";

export const metadata = { title: "Edit Pohon | Pohon Asuh" };

export default async function EditTreePage(props: PageProps<"/admin/pohon/[code]">) {
  await requireAdminLevel();
  const { code } = await props.params;
  const treeCode = decodeURIComponent(code);

  let tree: ApiTree | null = null;
  let desaList: ApiDesa[] = [];
  try {
    const row = await apiPost<Record<string, unknown>>("pohonbykode", { idpohon: treeCode });
    tree = row ? mapTree(row) : null;
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    tree = null;
  }
  if (!tree) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/pohon" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Pohon
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold pa-hgrad">
          Edit Pohon <span className="font-mono text-emerald-700">{tree.code}</span>
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/pohon/${encodeURIComponent(tree.code)}/galeri`}
            className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            Galeri Foto
          </Link>
          <StatusBadge
            {...(TREE_STATUS[tree.status] ?? {
              label: tree.status,
              className: "bg-zinc-100 text-zinc-600 dark:text-zinc-300",
            })}
          />
        </div>
      </div>

      {props.searchParams &&
        (await props.searchParams).saved && (
          <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
            Perubahan pohon tersimpan.
          </p>
        )}

      {tree.photoUrl && (
        <div className="relative mt-4 h-40 w-full overflow-hidden rounded-2xl bg-emerald-50 dark:bg-night-800 sm:h-52">
          <Image
            src={tree.photoUrl}
            alt={tree.localName}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <TreeForm
          desas={desaList.map((d) => ({ name: d.name }))}
          tree={{
            ...tree,
            // kolom URL menampilkan URL asli — bukan URL gambar default
            photoUrl: isDefaultTreePhoto(tree.photoUrl) ? "" : tree.photoUrl,
          }}
        />
      </div>
    </main>
  );
}
