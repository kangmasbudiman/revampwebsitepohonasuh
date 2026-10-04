import Link from "next/link";
import Image from "next/image";
import { apiGet, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { rupiah, TREE_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import TreeForm from "@/components/admin/tree-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteTree, setTreeUnggulan, removeTreeUnggulan } from "@/lib/actions/tree";

export const metadata = { title: "Admin — Kelola Pohon" };

const PER_PAGE = 50;

export default async function AdminTreePage(props: PageProps<"/admin/pohon">) {
  await requireAdminLevel();
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);

  let trees: ApiTree[] = [];
  let desaList: ApiDesa[] = [];
  try {
    trees = mapTrees(await apiGet<Record<string, unknown>[]>("pohonmapall"));
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    // tampilkan tabel kosong di bawah
  }

  const totalPages = Math.max(1, Math.ceil(trees.length / PER_PAGE));
  const pageTrees = trees.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">
          + Tambah Pohon Baru
        </summary>
        <div className="mt-4">
          <TreeForm desas={desaList.map((d) => ({ name: d.name }))} />
        </div>
      </details>

      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">{trees.length} pohon terdaftar</p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="pa-thead ">
            <tr>
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Pohon</th>
              <th className="px-4 py-3 font-semibold">Lokasi</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-center font-semibold">Unggulan</th>
              <th className="px-4 py-3 text-right font-semibold">Harga</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800 pa-card">
            {pageTrees.map((tree, i) => (
              <tr key={`${tree.code}-${i}`}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                  {tree.code}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-emerald-50 dark:bg-night-800">
                      <Image
                        src={tree.photoUrl}
                        alt={tree.localName}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">{tree.localName}</p>
                      <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{tree.species}</p>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{tree.desa}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    {...(TREE_STATUS[tree.status] ?? {
                      label: tree.status,
                      className: "bg-zinc-100 text-zinc-600 dark:text-zinc-300",
                    })}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  {tree.highlight === 1 ? (
                    <form action={removeTreeUnggulan}>
                      <input type="hidden" name="id" value={tree.id} />
                      <button
                        type="submit"
                        title="Klik untuk melepas status unggulan"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200"
                      >
                        ★ Unggulan
                      </button>
                    </form>
                  ) : (
                    <form action={setTreeUnggulan}>
                      <input type="hidden" name="id" value={tree.id} />
                      <button
                        type="submit"
                        disabled={tree.status !== "AVAILABLE"}
                        title={
                          tree.status !== "AVAILABLE"
                            ? "Hanya pohon berstatus tersedia yang bisa diunggulkan"
                            : "Tampilkan pohon ini di beranda"
                        }
                        className="rounded-full border border-emerald-200 dark:border-night-700 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300 dark:hover:bg-night-800"
                      >
                        Jadikan
                      </button>
                    </form>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-800">
                  {rupiah(tree.priceIdr)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/pohon/${encodeURIComponent(tree.code)}`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/pohon/${encodeURIComponent(tree.code)}/galeri`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Galeri
                    </Link>
                    <form action={deleteTree}>
                      <input type="hidden" name="idpohon" value={tree.code} />
                      <ConfirmSubmit
                        message={`Hapus pohon ${tree.code}? Tindakan ini tidak bisa dibatalkan.`}
                        disabled={tree.status !== "AVAILABLE"}
                        title={
                          tree.status !== "AVAILABLE"
                            ? "Pohon sudah diadopsi/dipesan — tidak bisa dihapus"
                            : undefined
                        }
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {pageTrees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Tidak ada data pohon.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/admin/pohon?page=${page - 1}`}
              className="rounded-xl border border-emerald-200 dark:border-night-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:hover:bg-night-800"
            >
              ← Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Halaman {page} dari {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/pohon?page=${page + 1}`}
              className="rounded-xl border border-emerald-200 dark:border-night-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:hover:bg-night-800"
            >
              Berikutnya →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
