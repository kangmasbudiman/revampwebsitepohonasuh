import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { apiPost, type OrderTreeMini } from "@/lib/api";
import OrderTreesModal from "@/components/mitra/order-trees-modal";
import { namaDesa } from "@/lib/format";
import { ChevronLeft, ChevronRight, History, SearchX } from "lucide-react";

export const metadata = { title: "Riwayat Pemesanan | Pohon Asuh" };

type Row = {
  id: number;
  mitra_id: number;
  program_id: number | null;
  program_nama: string | null;
  desa: string | null;
  jumlah: number;
  catatan: string | null;
  status: string;
  created_at: string | null;
  trees?: OrderTreeMini[];
  tree_count?: number;
};

type Summary = { pending: number; approved: number; rejected: number; cancelled: number; all: number };
type ListResponse = { data: Row[]; total: number; summary?: Summary; page?: number; per_page?: number };

const STATUS_LABEL: Record<string, [string, string]> = {
  pending: ["Menunggu Persetujuan", "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"],
  approved: ["Disetujui", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"],
  rejected: ["Ditolak", "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"],
  cancelled: ["Dibatalkan", "bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400"],
};

export default async function MitraRiwayatPesananPage(props: PageProps<"/mitra/riwayat-pesanan">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  try {
    const info = await apiPost<{ value?: number; mitra?: { id: number; nama: string } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
    }
  } catch {}
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const status = (typeof sp?.status === "string" ? sp.status : "semua").toLowerCase();
  const activeStatus = ["semua", "pending", "approved", "rejected", "cancelled"].includes(status) ? status : "semua";
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const page = Number(sp?.page ?? 1) || 1;

  let rows: Row[] = [];
  let total = 0;
  let currentPage = 1;
  let summary: Summary = { pending: 0, approved: 0, rejected: 0, cancelled: 0, all: 0 };
  let fetchError = false;
  try {
    const res = await apiPost<ListResponse>("mitrariwayatpesanan", { idmember: session.userId, status: activeStatus, q, page, per_page: 10 });
    rows = Array.isArray(res?.data) ? res.data : [];
    total = Number(res?.total ?? 0);
    currentPage = Number(res?.page ?? 1);
    if (res?.summary) summary = res.summary as Summary;
  } catch {
    fetchError = true;
  }

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const shownFrom = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const shownTo = Math.min(total, currentPage * perPage);

  const buildQuery = (nextPage: number, nextStatus = activeStatus, nextQ = q) => {
    const params = new URLSearchParams();
    params.set("status", nextStatus);
    if (nextQ) params.set("q", nextQ);
    params.set("page", String(nextPage));
    return `/mitra/riwayat-pesanan?${params.toString()}`;
  };

  const pill = (value: string, label: string, count: number) => {
    const active = activeStatus === value;
    return (
      <Link key={value} href={buildQuery(1, value)} id={`filter-${value}`} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-emerald-300"}`}>
        {label}
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25" : "bg-emerald-50 text-emerald-700 dark:bg-night-800 dark:text-emerald-300"}`}>{count.toLocaleString("id-ID")}</span>
      </Link>
    );
  };

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold pa-hgrad"><History className="h-7 w-7 text-emerald-600" aria-hidden />Riwayat Pemesanan</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Mitra: <strong>{mitraName}</strong> — pantau semua permintaan pohon Anda di satu tempat.</p>
        </div>
        <Link href="/mitra/pesanan" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">+ Pesan Pohon Lagi</Link>
      </div>

      {/* Statistik singkat */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700"><p className="text-[11px] text-zinc-500">Menunggu</p><p className="mt-0.5 text-2xl font-extrabold text-amber-600">{summary.pending}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700"><p className="text-[11px] text-zinc-500">Disetujui</p><p className="mt-0.5 text-2xl font-extrabold text-emerald-700">{summary.approved}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700"><p className="text-[11px] text-zinc-500">Ditolak</p><p className="mt-0.5 text-2xl font-extrabold text-red-600">{summary.rejected}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700"><p className="text-[11px] text-zinc-500">Dibatalkan</p><p className="mt-0.5 text-2xl font-extrabold text-zinc-600">{summary.cancelled}</p></div>
      </div>

      {/* Filter + cari */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pill("semua", "Semua", summary.all)}
        {pill("pending", "Menunggu", summary.pending)}
        {pill("approved", "Disetujui", summary.approved)}
        {pill("rejected", "Ditolak", summary.rejected)}
        {pill("cancelled", "Dibatalkan", summary.cancelled)}
      </div>
      <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={activeStatus} />
        <input name="q" defaultValue={q} placeholder="Cari desa / program / catatan…" className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
        <button type="submit" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">Cari</button>
        {q && <Link href={buildQuery(1, activeStatus, "")} className="text-xs text-zinc-500 underline">Reset pencarian</Link>}
      </form>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat riwayat.</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center">
          <SearchX className="h-10 w-10 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">{q ? `Tidak ada hasil untuk “${q}”` : "Belum ada pesanan"}</p>
          <p className="max-w-sm text-xs text-zinc-500">Ajukan pesanan pohon lewat menu Pemesanan Pohon — riwayat akan tampil di sini.</p>
          <Link href="/mitra/pesanan" className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">+ Pesan Pohon</Link>
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Desa</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3">Pohon</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {rows.map((r) => {
                  const lbl = STATUS_LABEL[r.status] ?? [r.status, "bg-zinc-100 text-zinc-600"];
                  return (
                    <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                      <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.desa ? namaDesa(r.desa) : "Semua desa"}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.program_nama ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold">{r.jumlah}</td>
                      <td className="px-4 py-3"><OrderTreesModal trees={r.trees ?? []} statusLabel={lbl[0]} /></td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${lbl[1]}`}>{lbl[0]}</span></td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{r.created_at ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <p>Menampilkan <span className="font-semibold text-zinc-700 dark:text-zinc-200">{shownFrom.toLocaleString("id-ID")}–{shownTo.toLocaleString("id-ID")}</span> dari {total.toLocaleString("id-ID")} pesanan</p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link href={buildQuery(currentPage - 1)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Sebelumnya
                </Link>
              )}
              <span className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-900 dark:bg-night-800 dark:text-emerald-200">{currentPage}/{totalPages}</span>
              {currentPage < totalPages && (
                <Link href={buildQuery(currentPage + 1)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
                  Berikutnya <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
