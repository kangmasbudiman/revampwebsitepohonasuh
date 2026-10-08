import Image from "next/image";
import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapCeritas, type ApiCerita } from "@/lib/api";
import CeritaForm from "@/components/admin/cerita-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteCerita } from "@/lib/actions/cerita";

export const metadata = { title: "Cerita Dampak | Pohon Asuh" };

export default async function AdminCeritaPage({
  searchParams,
}: PageProps<"/admin/cerita">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let cerita: ApiCerita[] = [];
  let fetchError = false;
  try {
    cerita = mapCeritas(await apiGet<Record<string, unknown>[]>("ceritalist"));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Cerita Dampak</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {cerita.length} cerita — tampil di halaman publik Cerita Dampak.
          </p>
        </div>
      </div>

      {sp?.saved && <Banner tone="ok">Perubahan cerita tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Cerita dihapus.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Cerita
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <CeritaForm />
        </div>
      </details>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data cerita. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Narasumber</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {cerita.map((c) => (
              <tr key={c.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                <td className="px-4 py-3">
                  {c.fotoUrl ? (
                    <Image
                      src={c.fotoUrl}
                      alt={c.judul}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🌱</span>
                  )}
                </td>
                <td className="max-w-[280px] px-4 py-3">
                  <Link
                    href={`/cerita-dampak/${c.id}`}
                    className="line-clamp-1 font-medium text-emerald-900 dark:text-emerald-100 hover:underline"
                  >
                    {c.judul}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-700 dark:text-zinc-200">{c.narasumber}</p>
                  {c.peran && <p className="text-xs text-zinc-400">{c.peran}</p>}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{c.lokasi || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/cerita/${c.id}/edit`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <form action={deleteCerita}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmit
                        message={`Hapus cerita "${c.judul}"? Tindakan ini tidak bisa dibatalkan.`}
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {cerita.length === 0 && !fetchError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada cerita dampak.
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
