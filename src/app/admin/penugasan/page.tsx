import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapPenugasan, type ApiPenugasan } from "@/lib/api";
import DesaPetugasForm from "@/components/admin/desa-petugas-form";

export const metadata = { title: "Penugasan Petugas | Pohon Asuh" };

export default async function PenugasanPage({
  searchParams,
}: PageProps<"/admin/penugasan">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let data: ApiPenugasan | null = null;
  try {
    data = mapPenugasan(await apiGet<Record<string, unknown>>("penugasandesa"));
  } catch {
    data = null;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Penugasan Petugas</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Tentukan petugas (operator) yang bertugas menandai pohon di tiap desa. Pohon di desa
        hanya muncul di daftar Order Tagging petugas yang ditugaskan.
      </p>

      {sp?.saved && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Penugasan tersimpan.
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">{String(sp.error)}</p>
      )}

      {!data && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data penugasan. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.desa.map((desa) => (
              <div
                key={desa.id}
                className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold capitalize pa-hgrad">{desa.nama}</h2>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{desa.provinsi ?? "—"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 dark:bg-night-800 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {desa.petugas.length} petugas
                  </span>
                </div>
                {desa.petugas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {desa.petugas.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-night-800 dark:text-emerald-300"
                      >
                        {p.nama}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 border-t border-emerald-50 pt-3 dark:border-night-800">
                  <DesaPetugasForm desa={desa} semuaPetugas={data.petugas} />
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-10 text-lg font-bold pa-hgrad">Ringkasan Petugas</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Jumlah Desa</th>
                  <th className="px-4 py-3">Desa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {data.petugas.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{p.nama}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{p.email}</td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">{p.jumDesa}</td>
                    <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300">{p.desaList || "—"}</td>
                  </tr>
                ))}
                {data.petugas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      Belum ada akun petugas (member dengan peran operator).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            Catatan: pembuatan akun petugas belum tersedia lewat web — hubungi pengelola data
            untuk menambah member berperan operator.
          </p>
        </>
      )}
    </main>
  );
}
