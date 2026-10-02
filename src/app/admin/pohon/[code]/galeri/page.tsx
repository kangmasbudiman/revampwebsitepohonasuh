import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { apiPost } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { deleteTreePhoto } from "@/lib/actions/tree";
import TreeGalleryForm from "@/components/admin/tree-gallery-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";

export const metadata = { title: "Galeri Pohon | Pohon Asuh" };

type Foto = { id: number; url: string };

export default async function TreeGalleryPage(
  props: PageProps<"/admin/pohon/[code]/galeri">,
) {
  await requireAdminLevel();
  const { code } = await props.params;
  const treeCode = decodeURIComponent(code);
  const sp = await props.searchParams;

  let namaPohon = treeCode;
  try {
    const tree = await apiPost<{ localname?: string } | null>("pohonbykode", { idpohon: treeCode });
    if (!tree) notFound();
    namaPohon = String(tree.localname ?? treeCode);
  } catch {
    // biarkan judul fallback ke kode
  }

  let fotos: Foto[] = [];
  try {
    fotos = (
      await apiPost<{ id?: number; urlnya?: string }[]>("pohonimage", { idpohon: treeCode })
    )
      .map((r) => ({ id: Number(r.id), url: String(r.urlnya ?? "") }))
      .filter((f) => f.id && f.url);
  } catch {
    fotos = [];
  }

  const back = `/admin/pohon/${encodeURIComponent(treeCode)}`;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href={back}
        className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
      >
        ← Edit Pohon
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">
        Galeri <span className="font-mono text-emerald-700 dark:text-emerald-400">{treeCode}</span> — {namaPohon}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Foto tambahan pohon ini (tampil di halaman detail publik). Foto utama tetap diatur dari
        form Edit Pohon.
      </p>

      {sp?.hapus && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Foto dihapus dari galeri.
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {String(sp.error)}
        </p>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
        <h2 className="font-semibold pa-hgrad">Tambah Foto</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          jpg/png/webp, maksimal 2MB per foto.
        </p>
        <div className="mt-3">
          <TreeGalleryForm code={treeCode} />
        </div>
      </div>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
        <h2 className="font-semibold pa-hgrad">
          Foto Galeri ({fotos.length})
        </h2>
        {fotos.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {fotos.map((f) => (
              <div key={f.id} className="overflow-hidden rounded-xl border border-emerald-100 dark:border-night-700">
                <div className="relative aspect-square bg-emerald-50 dark:bg-night-800">
                  <Image
                    src={f.url}
                    alt={`Galeri ${treeCode} ${f.id}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    Lihat ↗
                  </a>
                  <form action={deleteTreePhoto}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="idpohon" value={treeCode} />
                    <ConfirmSubmit
                      message="Hapus foto ini dari galeri pohon?"
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Hapus
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-night-800 dark:text-zinc-400">
            Belum ada foto galeri untuk pohon ini.
          </p>
        )}
      </div>
    </main>
  );
}
