import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { apiGet, apiPost, isDefaultTreePhoto, mapDesa, mapTree, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { TREE_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import TreeForm from "@/components/admin/tree-form";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Edit Pohon | Pohon Asuh" };

export default async function EditTreePage(props: PageProps<"/admin/pohon/[code]">) {
  await requireAdminLevel();
  const { code } = await props.params;
  const searchParams = await props.searchParams;
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

      {searchParams.saved && (
        <SuccessPopup
          paramKey="saved"
          title="Perubahan pohon tersimpan"
          subtitle={`${tree.localName} · ${tree.code}`}
        >
          Perubahan data pohon{" "}
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:bg-night-800 dark:text-zinc-200">
            {tree.code}
          </span>{" "}
          sudah tersimpan.
        </SuccessPopup>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
          <TreeForm
            desas={desaList.map((d) => ({ name: d.name }))}
            tree={{
              ...tree,
              // kolom URL menampilkan URL asli — bukan URL gambar default
              photoUrl: isDefaultTreePhoto(tree.photoUrl) ? "" : tree.photoUrl,
            }}
          />
        </div>

        {/* Preview foto: rasio wajar + object-contain agar foto tampil UTUH
            (banner lebar memotong foto portrait jadi tak dikenali). */}
        <aside className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-4 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <ImageIcon className="h-4 w-4" />
            Foto Saat Ini
          </div>
          <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/60 dark:border-night-700 dark:bg-night-800">
            <Image
              src={tree.photoUrl}
              alt={tree.localName}
              width={640}
              height={480}
              sizes="320px"
              className="h-full w-full object-contain"
            />
          </div>
          {isDefaultTreePhoto(tree.photoUrl) ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Belum ada foto unggahan — pohon tampil dengan gambar default.
            </p>
          ) : (
            <>
              <p className="mt-3 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {tree.localName} · <span className="font-mono">{tree.code}</span>
              </p>
              <a
                href={tree.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
              >
                Buka ukuran penuh <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
