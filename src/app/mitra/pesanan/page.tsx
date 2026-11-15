import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapDesa, mapProgramMitra, mapMitraPesanan, type ApiDesa, type ApiProgramMitra, type ApiMitraPesanan } from "@/lib/api";
import { requestPesananMitra } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Pemesanan Pohon | Pohon Asuh" };

export default async function MitraPesananPage(props: PageProps<"/mitra/pesanan">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  let aktif = 1;
  let programs: ApiProgramMitra[] = [];
  let desas: ApiDesa[] = [];
  let pesanan: ApiMitraPesanan[] = [];

  try {
    const info = await apiPost<{
      value?: number;
      mitra?: { id: number; nama: string; aktif: number };
    }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
      aktif = Number(info.mitra?.aktif ?? 1);
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra).filter((p) => p.aktif);
    }
  } catch {}

  try {
    desas = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    desas = [];
  }

  try {
    pesanan = (await apiPost<Record<string, unknown>[]>("mitramypesanan", { idmember: session.userId })).map(mapMitraPesanan);
  } catch {
    pesanan = [];
  }

  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const statusBadge = (s: string) => {
    if (s === "approved") return "bg-emerald-100 text-emerald-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    return "bg-amber-100 text-amber-800";
  };
  const statusLabel = (s: string) =>
    s === "approved" ? "Disetujui" : s === "rejected" ? "Ditolak" : "Menunggu Persetujuan";

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Pemesanan Pohon</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Mitra: <strong>{mitraName}</strong>. Pilih lokasi/kelompok pohon, tentukan jumlah, lalu kirim
        permintaan — menunggu pemeriksaan & persetujuan admin KKI Warsi.
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Pesanan Terkirim">Permintaan pemesanan terkirim. Admin akan memeriksa ketersediaan & menyetujui.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {aktif === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-center text-sm text-amber-800">
          Akun Anda menunggu aktivasi admin — belum bisa mengajukan pesanan.
        </div>
      ) : (
        <form action={requestPesananMitra} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Lokasi / Desa (opsional)</span>
            <select name="desa" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
              <option value="">Semua lokasi / dipilih admin</option>
              {desas.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Jumlah pohon <span className="text-red-500">*</span></span>
            <input name="jumlah" type="number" min={1} max={500} required defaultValue={10} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Program (opsional)</span>
            <select name="program_id" defaultValue="0" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
              <option value="0">— Tanpa program —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Catatan (opsional)</span>
            <input name="catatan" placeholder="mis. minimal diameter 30cm, prioritaskan desa X" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          </label>
          <button type="submit" className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            Kirim Permintaan Pemesanan
          </button>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <h2 className="border-b border-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-night-700 dark:text-emerald-200">
          Riwayat Pemesanan
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Desa</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {pesanan.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{p.desa ?? "Semua desa"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{p.programNama ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">{p.jumlah}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{p.createdAt ?? "—"}</td>
              </tr>
            ))}
            {pesanan.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Belum ada pemesanan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
