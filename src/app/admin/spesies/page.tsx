import Image from "next/image";
import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapSpeciesList, type ApiSpecies } from "@/lib/api";
import SpeciesForm from "@/components/admin/species-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteSpecies } from "@/lib/actions/species";

export const metadata = { title: "Kelola Spesies | Pohon Asuh" };

export default async function AdminSpeciesPage({
  searchParams,
}: PageProps<"/admin/spesies">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let species: ApiSpecies[] = [];
  let fetchError = false;
  try {
    species = mapSpeciesList(await apiGet<Record<string, unknown>[]>("specieslist"));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Kelola Spesies</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {species.length} spesies — ensiklopedia katalog publik & kalkulator karbon.
          </p>
        </div>
        <Link
          href="/spesies"
          className="rounded-xl border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
        >
          Lihat katalog publik ↗
        </Link>
      </div>

      {sp?.saved && <Banner tone="ok">Perubahan spesies tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Spesies dihapus.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Spesies
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <SpeciesForm />
        </div>
      </details>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat katalog spesies. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nama Latin</th>
              <th className="px-4 py-3">Nama Lokal</th>
              <th className="px-4 py-3">Famili</th>
              <th className="px-4 py-3 text-right">Karbon</th>
              <th className="px-4 py-3 text-right">Pohon</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {species.map((s) => (
              <tr key={s.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                <td className="px-4 py-3">
                  {s.photoUrl ? (
                    <Image
                      src={s.photoUrl}
                      alt={s.namaLatin}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🌳</span>
                  )}
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  <Link
                    href={`/spesies/${s.id}`}
                    className="line-clamp-1 font-medium italic text-emerald-900 dark:text-emerald-100 hover:underline"
                  >
                    {s.namaLatin}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.namaLokal || "—"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{s.famili || "—"}</td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                  {s.serapanKarbon !== null ? `${s.serapanKarbon} kg` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">{s.jmlPohon}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/spesies/${s.id}/edit`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <form action={deleteSpecies}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit
                        message={`Hapus spesies "${s.namaLatin}"? Tindakan ini tidak bisa dibatalkan.`}
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {species.length === 0 && !fetchError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada spesies di katalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Banner({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600 dark:text-red-400"
      }`}
    >
      {children}
    </p>
  );
}
