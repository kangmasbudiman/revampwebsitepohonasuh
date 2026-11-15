import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet, type ApiMitraPesanan } from "@/lib/api";
import { approvePesananMitra, rejectPesananMitra } from "@/lib/actions/mitra";
import ConfirmSubmit from "@/components/admin/confirm-submit";

export const metadata = { title: "Pesanan Pohon Mitra | Pohon Asuh" };

type PendingRow = ApiMitraPesanan & {
  mitra_nama: string;
  member_nama: string;
  program_nama: string | null;
};

export default async function AdminPesananMitraPage(props: PageProps<"/admin/pesanan-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let rows: PendingRow[] = [];
  let fetchError = false;
  try {
    rows = (await apiGet<PendingRow[]>("mitrapendingpesanan")) ?? [];
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Pesanan Pohon Mitra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Permintaan pemesanan dari mitra. Setujui untuk mengalokasikan pohon tersedia
        (di desa yang diminta atau di mana pun jika tidak ditentukan) ke mitra.
      </p>

      {sp?.approved && <SuccessPopup paramKey="approved" title="Disetujui">Pesanan disetujui & pohon dialokasikan.</SuccessPopup>}
      {sp?.rejected && <SuccessPopup paramKey="rejected" title="Ditolak">Pesanan ditolak.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat pesanan.</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Tidak ada pesanan pending.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Mitra</th>
                <th className="px-4 py-3 font-semibold">Akun</th>
                <th className="px-4 py-3 font-semibold">Desa</th>
                <th className="px-4 py-3 font-semibold">Program</th>
                <th className="px-4 py-3 font-semibold">Jumlah</th>
                <th className="px-4 py-3 font-semibold">Catatan</th>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.mitra_nama}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.member_nama}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.desa ?? "Semua desa"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.program_nama ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{r.jumlah}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{r.catatan ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{r.createdAt ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={approvePesananMitra} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="mr-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Setujui & Alokasikan</button>
                    </form>
                    <form action={rejectPesananMitra} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit message={`Tolak pesanan ${r.jumlah} pohon dari ${r.mitra_nama}?`} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">
                        Tolak
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
