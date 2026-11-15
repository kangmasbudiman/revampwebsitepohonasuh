import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet, mapMitra, mapProgramMitra, type ApiMitra, type ApiProgramMitra } from "@/lib/api";
import { tambahProgramMitra, hapusProgramMitra } from "@/lib/actions/mitra";
import ConfirmSubmit from "@/components/admin/confirm-submit";

export const metadata = { title: "Program Mitra | Pohon Asuh" };

export default async function AdminProgramMitraPage(props: PageProps<"/admin/program-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let mitras: ApiMitra[] = [];
  let programs: ApiProgramMitra[] = [];
  let fetchError = false;
  try {
    mitras = (await apiGet<Record<string, unknown>[]>("mitralist")).map(mapMitra);
    programs = (await apiGet<Record<string, unknown>[]>("programmitralist")).map(mapProgramMitra);
  } catch {
    fetchError = true;
  }

  const mitraName = (id: number) => mitras.find((m) => m.id === id)?.nama ?? `Mitra #${id}`;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Program Mitra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Program/kampanye milik mitra. Satu mitra dapat memiliki beberapa program.
      </p>

      {sp?.created && <SuccessPopup paramKey="created" title="Ditambahkan">Program ditambahkan.</SuccessPopup>}
      {sp?.deleted && <SuccessPopup paramKey="deleted" title="Terhapus">Program dihapus.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">+ Tambah Program Mitra</summary>
        <form action={tambahProgramMitra} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select name="mitra_id" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value="">Pilih mitra…</option>
            {mitras.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
          </select>
          <input name="nama" placeholder="Nama program" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="durasi" placeholder="Durasi (mis. 3 bulan)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="tgl_mulai" type="date" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="tgl_selesai" type="date" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <select name="aktif" defaultValue="1" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
          <textarea name="deskripsi" placeholder="Deskripsi (opsional)" className="sm:col-span-2 lg:col-span-4 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" rows={2} />
          <input name="logo" placeholder="Logo (opsional) — upload lewat admin berikutnya" className="sm:col-span-2 lg:col-span-4 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <button type="submit" className="sm:col-span-2 lg:col-span-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Program</button>
        </form>
      </details>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat data.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Mitra</th>
                <th className="px-4 py-3 font-semibold">Nama Program</th>
                <th className="px-4 py-3 font-semibold">Periode / Durasi</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {programs.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3">{mitraName(p.mitraId)}</td>
                  <td className="px-4 py-3 font-medium">{p.nama}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {p.tglMulai ?? "—"} → {p.tglSelesai ?? "—"}
                    {p.durasi && <span className="block text-zinc-400">{p.durasi}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.aktif ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {p.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={hapusProgramMitra} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmit message={`Hapus program ${p.nama}?`} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Belum ada program mitra.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
