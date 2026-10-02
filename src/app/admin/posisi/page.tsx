import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapPosisiPetugasList, type ApiPosisiPetugas } from "@/lib/api";
import PosisiMapLoader from "@/components/admin/posisi-map-loader";

export const metadata = { title: "Posisi Petugas | Pohon Asuh" };

const STALE_MS = 6 * 60 * 60 * 1000;

export default async function PosisiPage() {
  await requireAdminLevel();

  let petugas: ApiPosisiPetugas[] = [];
  try {
    petugas = mapPosisiPetugasList(await apiGet<Record<string, unknown>[]>("posisipetugas"));
  } catch {
    // tampilkan tabel kosong + pesan
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Posisi Petugas</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Posisi GPS terakhir petugas dari aplikasi mobile. Titik hijau = update dalam 6 jam,
        merah = lebih lama.
      </p>

      <div className="mt-6">
        {petugas.length > 0 ? (
          <PosisiMapLoader petugas={petugas} />
        ) : (
          <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-emerald-200 dark:border-night-700 bg-emerald-50 dark:bg-night-800/40 text-sm text-zinc-500 dark:text-zinc-400">
            Belum ada data posisi petugas.
          </div>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Petugas</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Koordinat</th>
              <th className="px-4 py-3">Update Terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {petugas.map((p) => {
              const stale = p.updatedAt
                ? Date.now() - new Date(p.updatedAt).getTime() > STALE_MS
                : false;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{p.nama}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{p.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </td>
                  <td className={`px-4 py-3 ${stale ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-600"}`}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleString("id-ID") : "—"}
                  </td>
                </tr>
              );
            })}
            {petugas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Tidak ada data posisi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
