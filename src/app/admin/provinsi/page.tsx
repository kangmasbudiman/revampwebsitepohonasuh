import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet } from "@/lib/api";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import ProvinsiForm from "@/components/admin/provinsi-form";
import { hapusProvinsi } from "@/lib/actions/provinsi";

export const metadata = { title: "Kelola Provinsi | Pohon Asuh" };

type ProvinsiRow = { id: number; name: string };

export default async function ProvinsiPage({ searchParams }: PageProps<"/admin/provinsi">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let rows: ProvinsiRow[] = [];
  try {
    rows = await apiGet<ProvinsiRow[]>("provinsiadm");
  } catch {
    // Sistem API-belum-bisa
  }

  const q = typeof sp?.q === "string" ? sp.q.trim().toLowerCase() : "";
  const filtered = rows.filter((r) => r.name.toLowerCase().includes(q));
  const editId = sp?.edit ? Number(Array.isArray(sp.edit) ? sp.edit[0] : sp.edit) : null;
  const editRow = editId ? rows.find((r) => r.id === editId) : null;

  const ubahCls =
    "mr-1 inline-block rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40";
  const hapusCls =
    "rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40";

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Kelola Provinsi</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Daftar provinsi yang dipakai untuk pilihan provinsi di Program Mitra.
      </p>

      {sp?.saved && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Tersimpan!
        </div>
      )}

      {editRow && (
        <div className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <h2 className="mb-4 text-base font-semibold text-emerald-800 dark:text-emerald-200">
            Ubah Provinsi · {editRow.name}
          </h2>
          <ProvinsiForm provinsi={editRow} />
        </div>
      )}

      <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">＋ Tambah Provinsi</summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <ProvinsiForm />
        </div>
      </details>

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="border-b border-emerald-100 px-4 py-3 dark:border-night-700">
          <form method="get" action="/admin/provinsi" className="flex items-center gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari nama provinsi…"
              className="w-56 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400"
            />
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Cari
            </button>
          </form>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {filtered.length} provinsi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Nama Provinsi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-4 py-3 text-xs text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{r.name}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/admin/provinsi?edit=${r.id}`} className={ubahCls}>
                      Ubah
                    </Link>
                    <form action={hapusProvinsi} className="ml-2 inline">
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit
                        message={`Hapus provinsi "${r.name}"? Nama ini akan hilang dari dropdown pilihan provinsi Program Mitra.`}
                        className={hapusCls}
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    {rows.length === 0 ? "Belum ada data provinsi. Tambahkan di atas." : "Tidak ada provinsi yang cocok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
