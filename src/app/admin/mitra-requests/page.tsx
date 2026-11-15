import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet } from "@/lib/api";
import { approveMitraHold, rejectMitraHold } from "@/lib/actions/mitra";
import ConfirmSubmit from "@/components/admin/confirm-submit";

export const metadata = { title: "Request Hold Mitra | Pohon Asuh" };

type PendingRow = {
  id: number;
  mitra_id: number;
  idmember: number;
  idpohon: string;
  status: string;
  mitra_nama: string;
  member_nama: string;
  created_at: string;
};

export default async function AdminMitraRequestsPage(props: PageProps<"/admin/mitra-requests">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let rows: PendingRow[] = [];
  let fetchError = false;
  try {
    rows = (await apiGet<PendingRow[]>("mitrapendingholds")) ?? [];
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Request Hold Mitra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Daftar permintaan penahanan pohon dari mitra. Setujui untuk menahan pohon
        (status Dipesan Mitra) atau tolak (pohon tetap tersedia).
      </p>

      {sp?.approved && <SuccessPopup paramKey="approved" title="Disetujui">Request hold disetujui.</SuccessPopup>}
      {sp?.rejected && <SuccessPopup paramKey="rejected" title="Ditolak">Request hold ditolak.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat request.</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Tidak ada request pending.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Mitra</th>
                <th className="px-4 py-3 font-semibold">Akun Pemesan</th>
                <th className="px-4 py-3 font-semibold">Kode Pohon</th>
                <th className="px-4 py-3 font-semibold">Waktu Request</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.mitra_nama}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.member_nama}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.idpohon}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{r.created_at}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={approveMitraHold} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="mr-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Setujui</button>
                    </form>
                    <form action={rejectMitraHold} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit message={`Tolak request hold pohon ${r.idpohon}?`} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">
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
