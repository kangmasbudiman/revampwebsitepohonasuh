import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapPartners, mapTestimonis, type ApiPartner, type ApiTestimoni } from "@/lib/api";
import { TestimoniForm, PartnerForm } from "@/components/admin/testimoni-forms";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deletePartner, deleteTestimoni } from "@/lib/actions/testimoni";

export const metadata = { title: "Testimoni & Partner | Pohon Asuh" };

export default async function AdminTestimoniPage({
  searchParams,
}: PageProps<"/admin/testimoni">) {
  await requireAdminLevel();
  const sp = await searchParams;
  const editTestimoniId = Number(sp?.edit) || 0;

  let testimoni: ApiTestimoni[] = [];
  let partners: ApiPartner[] = [];
  let fetchError = false;
  try {
    testimoni = mapTestimonis(await apiGet<Record<string, unknown>[]>("testimonilist"));
    partners = mapPartners(await apiGet<Record<string, unknown>[]>("partnerlist"));
  } catch {
    fetchError = true;
  }

  const editTestimoni = editTestimoniId
    ? (testimoni.find((t) => t.id === editTestimoniId) ?? null)
    : null;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">
        Testimoni &amp; Partner
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Testimoni donatur/pengurus dan logo mitra untuk beranda publik — section hanya muncul di
        beranda setelah ada isinya.
      </p>

      {sp?.saved && <Banner tone="ok">Perubahan tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Data dihapus.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      {fetchError && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      {/* ===== Testimoni ===== */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold pa-hgrad">
          Testimoni ({testimoni.length})
        </h2>

        <details
          open={!!editTestimoni}
          className="mt-4 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm"
        >
          <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
            {editTestimoni ? `✎ Edit testimoni — ${editTestimoni.nama}` : "＋ Tambah Testimoni"}
          </summary>
          <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
            <TestimoniForm row={editTestimoni ?? undefined} />
          </div>
        </details>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Isi</th>
                <th className="px-4 py-3 text-right">Urutan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {testimoni.map((t) => (
                <tr key={t.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                  <td className="px-4 py-3 font-medium text-emerald-900 dark:text-emerald-100">
                    {t.nama}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{t.peran || "—"}</td>
                  <td className="max-w-[320px] px-4 py-3">
                    <p className="line-clamp-2 text-zinc-600 dark:text-zinc-300">{t.isi}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                    {t.urutan}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/testimoni?edit=${t.id}`}
                        className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                      >
                        Edit
                      </Link>
                      <form action={deleteTestimoni}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmSubmit
                          message={`Hapus testimoni dari "${t.nama}"?`}
                          className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                        >
                          Hapus
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {testimoni.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Belum ada testimoni — section “Kata Mereka” belum tampil di beranda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Partner ===== */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold pa-hgrad">
          Partner ({partners.length})
        </h2>

        <details className="mt-4 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
            ＋ Tambah Partner
          </summary>
          <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
            <PartnerForm />
          </div>
        </details>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3 text-right">Urutan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                  <td className="px-4 py-3">
                    {p.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.logoUrl}
                        alt={p.nama}
                        className="h-9 w-16 object-contain"
                      />
                    ) : (
                      <span className="text-xl">🤝</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-900 dark:text-emerald-100">
                    {p.nama}
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-1 text-emerald-700 hover:underline"
                      >
                        {p.url}
                      </a>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">
                    {p.urutan}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <form action={deletePartner}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit
                          message={`Hapus partner "${p.nama}"?`}
                          className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                        >
                          Hapus
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Belum ada partner — section “Didukung Oleh” belum tampil di beranda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
