import { requireUser } from "@/lib/guard";
import { apiPost, mapMitraPesanan, type ApiMitraPesanan, type ApiProgramMitra, mapProgramMitra, apiGet } from "@/lib/api";
import { batalkanPesananMitra } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { CircleOff, History, AlertTriangle, TreePine, CalendarDays, MapPin, HeartHandshake } from "lucide-react";

export const metadata = { title: "Pembatalan Program | Pohon Asuh" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400",
};

export default async function MitraPembatalanPage(props: PageProps<"/mitra/pembatalan">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraName = "";
  let mitraId: number | null = null;
  let pesanan: ApiMitraPesanan[] = [];
  let programNames: Map<number, string> = new Map();

  try {
    const info = await apiPost<{
      value?: number;
      mitra?: { id: number; nama: string };
    }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
      try {
        const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
        programNames = new Map(prows.map(mapProgramMitra).map((p: ApiProgramMitra) => [p.id, p.nama]));
      } catch {
        programNames = new Map();
      }
    }
  } catch {
    // bukan mitra
  }

  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  try {
    const rows = await apiPost<Record<string, unknown>[]>("mitramypesanan", { idmember: session.userId });
    pesanan = (Array.isArray(rows) ? rows : []).map(mapMitraPesanan);
  } catch {
    pesanan = [];
  }

  const activeOrders = pesanan.filter((p) => p.status === "pending" || p.status === "approved");
  const history = pesanan.filter((p) => p.status === "cancelled" || p.status === "rejected");
  const namaProgram = (p: ApiMitraPesanan) => p.programNama ?? (p.programId ? programNames.get(p.programId) ?? "-" : "-");

  return (
    <main className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="flex items-center gap-3 text-2xl font-bold pa-hgrad"><CircleOff className="h-7 w-7 text-emerald-600" aria-hidden />Pembatalan Program</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Mitra: <strong>{mitraName}</strong>. Batalkan permintaan pohon Anda — termasuk yang sudah disetujui. Pohon yang masih <em>reserved</em> akan kembali ke pool admin.
      </p>

      {sp?.ok && <SuccessPopup paramKey="ok" title="Dibatalkan">Pesanan berhasil dibatalkan.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {activeOrders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center">
          <HeartHandshake className="h-10 w-10 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">Tidak ada pesanan yang bisa dibatalkan</p>
          <p className="max-w-sm text-xs text-zinc-500">Semua pesanan Anda sudah diproses atau dibatalkan sebelumnya. Ajukan pesanan baru lewat menu Pemesanan Pohon.</p>
        </div>
      ) : (
        <form action={batalkanPesananMitra} className="mt-6 grid gap-5 lg:grid-cols-5">
          {/* Pilih pesanan */}
          <fieldset className="lg:col-span-3 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
            <legend className="px-2 text-xs font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">1 · Pilih Pesanan yang Dibatalkan</legend>
            <div className="mt-2 space-y-3">
              {activeOrders.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition has-[:checked]:border-emerald-500 has-[:checked]:ring-2 has-[:checked]:ring-emerald-300 dark:border-night-700 dark:bg-night-950 dark:has-[:checked]:border-emerald-600">
                  <input type="radio" name="id" value={p.id} className="mt-1.5 h-4 w-4 accent-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-emerald-950 dark:text-emerald-100">{namaProgram(p)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1"><TreePine className="h-3.5 w-3.5" aria-hidden />{p.jumlah} pohon</span>
                      {p.desa && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{p.desa}</span>}
                      {p.createdAt && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{p.createdAt}</span>}
                    </span>
                    {p.catatan && <span className="mt-1 block text-[11px] text-zinc-400">“{p.catatan}”</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Alasan & konfirmasi */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" aria-hidden />Perhatian</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>Pesanan yang sudah disetujui: pohon <strong>reserved</strong> dikembalikan ke pool admin.</li>
                <li>Pohon yang sudah <strong>adopted</strong> oleh pengadopsi tidak dapat ditarik kembali.</li>
                <li>Pembatalan langsung berlaku tanpa persetujuan admin.</li>
              </ul>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Alasan pembatalan <span className="text-red-500">*</span></span>
              <textarea name="alasan" required minLength={10} rows={5} placeholder="mis. Program tidak jadi dijalankan, salah jumlah pesanan…" className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              <span className="mt-1 block text-[11px] text-zinc-400">Minimal 10 karakter — tersimpan di catatan pesanan & dikirim ke admin.</span>
            </label>

            <ConfirmSubmit
              message="Batalkan pesanan ini? Pohon yang masih reserved akan kembali ke pool. Tindakan ini langsung berlaku."
              confirmLabel="Ya, Batalkan Pesanan"
              className="rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-red-700"
            >
              Batalkan Pesanan
            </ConfirmSubmit>
          </div>
        </form>
      )}

      {/* Riwayat pembatalan */}
      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"><History className="h-4 w-4" aria-hidden />Riwayat Pembatalan & Penolakan</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold">Jumlah</th>
                  <th className="px-4 py-3 font-semibold">Desa</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {history.map((p) => (
                  <tr key={p.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                    <td className="px-4 py-3 font-medium">{namaProgram(p)}</td>
                    <td className="px-4 py-3">{p.jumlah}</td>
                    <td className="px-4 py-3 text-zinc-500">{p.desa ?? "Semua desa"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[p.status] ?? STATUS_BADGE.cancelled}`}>{STATUS_LABEL[p.status] ?? p.status}</span></td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{p.createdAt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
