import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet, mapProgramMitra, type ApiMitraPesanan, type ApiProgramMitra } from "@/lib/api";
import { rupiah, formatProvinsi } from "@/lib/format";
import { rejectPesananMitra } from "@/lib/actions/mitra";
import OrderTreesModal from "@/components/mitra/order-trees-modal";
import AlokasiPohonButton from "@/components/admin/alokasi-pohon-button";
import type { OrderTreeMini } from "@/lib/api";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

export const metadata = { title: "Pesanan Pohon Mitra | Pohon Asuh" };

type PendingRow = ApiMitraPesanan & {
  mitra_nama: string;
  member_nama: string;
  program_nama: string | null;
  pohon_pilihan?: string | null;
  tree_count?: number;
  jumlah_teradopsi?: number | null;
};
type Summary = { pending: number; approved: number; rejected: number; all: number };
type ListResponse = { data: PendingRow[]; total: number; page: number; per_page: number; summary?: Summary };

const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Disetujui", rejected: "Ditolak" };
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export default async function AdminPesananMitraPage(props: PageProps<"/admin/pesanan-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  const status = (typeof sp?.status === "string" ? sp.status : "pending").toLowerCase();
  const activeStatus = ["pending", "approved", "rejected", "semua"].includes(status) ? status : "pending";
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const page = Number(sp?.page ?? 1) || 1;
  const perPage = 10;
  const ASSET_ORIGIN = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

  let rows: PendingRow[] = [];
  let total = 0;
  let currentPage = 1;
  let summary: Summary = { pending: 0, approved: 0, rejected: 0, all: 0 };
  let fetchError = false;
  try {
    const base = process.env.API_BASE_URL;
    const key = process.env.ADMIN_API_KEY ?? "";
    const url = `${base}/mitrapendingpesanan?status=${encodeURIComponent(activeStatus === "semua" ? "semua" : activeStatus)}&q=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}`;
    // backend butuh header X-Admin-Key? mitrapendingpesanan saat ini tidak dilindungi —
    // tetap kirim agar konsisten jika suatu saat diperketat.
    const res = await fetch(url, { headers: { "X-Admin-Key": key }, cache: "no-store" });
    const json = (await res.json()) as ListResponse | PendingRow[];
    if (Array.isArray(json)) {
      // kompatibilitas bila backend masih bal[deprecated]
      rows = json as PendingRow[];
      total = rows.length;
      currentPage = 1;
    } else {
      // Backend mengembalikan snake_case (program_id, created_at) — normalisasi.
      rows = (json.data ?? []).map((r) => {
        const raw = r as unknown as { program_id?: number | null; created_at?: string | null };
        return {
          ...r,
          programId: r.programId ?? raw.program_id ?? null,
          createdAt: r.createdAt ?? raw.created_at ?? null,
        };
      });
      total = Number(json.total ?? 0);
      currentPage = Number(json.page ?? 1);
      summary = json.summary ?? summary;
    }
  } catch {
    fetchError = true;
  }

  // Data program → provinsi / masa berlaku / total budget untuk kolom tabel.
  let programMap = new Map<number, ApiProgramMitra>();
  try {
    const prows = await apiGet<Record<string, unknown>[]>("programmitralist");
    programMap = new Map(prows.map(mapProgramMitra).map((p) => [p.id, p]));
  } catch {}

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const shownFrom = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const shownTo = Math.min(total, currentPage * perPage);

  const buildQuery = (nextPage: number, nextStatus = activeStatus, nextQ = q) => {
    const params = new URLSearchParams();
    params.set("status", nextStatus);
    if (nextQ) params.set("q", nextQ);
    params.set("page", String(nextPage));
    return `/admin/pesanan-mitra?${params.toString()}`;
  };

  const pill = (value: string, label: string, count: number) => {
    const active = activeStatus === value;
    return (
      <Link
        key={value}
        href={buildQuery(1, value)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          active ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-emerald-300 dark:hover:bg-night-800"
        }`}
      >
        {label}
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25" : "bg-emerald-50 text-emerald-700 dark:bg-night-800 dark:text-emerald-300"}`}>
          {count.toLocaleString("id-ID")}
        </span>
      </Link>
    );
  };

  return (
    <main className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Pesanan Pohon Mitra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Permintaan pemesanan dari mitra. Setujui &amp; pilih pohon yang tersedia di provinsi yang diminta pada program
        (alokasi otomatis bila tidak memilih).
      </p>

      {sp?.approved && <SuccessPopup paramKey="approved" title="Disetujui">Pesanan disetujui & pohon dialokasikan.</SuccessPopup>}
      {sp?.alokasi && <SuccessPopup paramKey="alokasi" title="Alokasi Diperbarui">Pohon pesanan berhasil diatur ulang.</SuccessPopup>}
      {sp?.rejected && <SuccessPopup paramKey="rejected" title="Ditolak">Pesanan ditolak.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {/* Filter status + cari */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {pill("pending", "Pending", summary.pending)}
        {pill("approved", "Disetujui", summary.approved)}
        {pill("rejected", "Ditolak", summary.rejected)}
        {pill("semua", "Semua", summary.all)}
      </div>
      <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={activeStatus} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari mitra / akun / desa / program / catatan…"
          aria-label="Cari pesanan"
          className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        />
        <button type="submit" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">Cari</button>
        {q && (
          <Link href={buildQuery(1, activeStatus, "")} className="text-xs text-zinc-500 underline">Reset pencarian</Link>
        )}
      </form>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat pesanan.</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center">
          <SearchX className="h-10 w-10 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">
            {q ? `Tidak ada hasil untuk “${q}”` : `Tidak ada pesanan ${activeStatus === "semua" ? "" : STATUS_LABEL[activeStatus] ?? activeStatus}.`}
          </p>
          <p className="max-w-sm text-xs text-zinc-500">Coba ubah filter status atau kata pencarian.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <th className="px-4 py-3 font-semibold">Mitra</th>
                  <th className="px-4 py-3 font-semibold">Akun</th>
                  <th className="px-4 py-3 font-semibold">Desa</th>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold">Provinsi</th>
                  <th className="px-4 py-3 font-semibold">Masa Berlaku</th>
                  <th className="px-4 py-3 font-semibold">Total Budget</th>
                  <th className="px-4 py-3 font-semibold">Jumlah</th>
                  <th className="px-4 py-3 font-semibold">Sisa Pohon</th>
                  <th className="px-4 py-3 font-semibold">Pohon Dipilih</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {rows.map((r, i) => {
                  const prog = r.programId ? programMap.get(Number(r.programId)) : null;
                  return (
                  <tr key={r.id} className="transition-colors hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.mitra_nama}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.member_nama}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.desa ?? "Semua desa"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.program_nama ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">{prog ? formatProvinsi(prog.provinsi) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {prog ? `${prog.tglMulai ?? "—"} → ${prog.tglSelesai ?? "—"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{prog?.budget ? rupiah(prog.budget) : "—"}</td>
                    <td className="px-4 py-3 font-semibold">{r.jumlah}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${Math.max(0, r.jumlah - Number(r.jumlah_teradopsi ?? 0)) === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {Math.max(0, r.jumlah - Number(r.jumlah_teradopsi ?? 0))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const raw = (r as unknown as { trees?: OrderTreeMini[] }).trees ?? [];
                        if (Array.isArray(raw) && raw.length > 0) {
                          return <OrderTreesModal trees={raw} statusLabel={r.status === "approved" ? "Disetujui" : r.status === "rejected" ? "Ditolak" : "Menunggu Persetujuan"} />;
                        }
                        if (r.pohon_pilihan) {
                          try {
                            const codes = JSON.parse(r.pohon_pilihan) as string[];
                            if (Array.isArray(codes) && codes.length > 0) {
                              return <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800">{codes.length} pohon dipilih</span>;
                            }
                          } catch {}
                        }
                        return <span className="text-[11px] text-zinc-400">otomatis</span>;
                      })()}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400" title={r.catatan ?? ""}>{r.catatan ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{r.createdAt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[r.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/admin/pesanan-mitra/${r.id}`} className="mr-2 inline-flex rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">Detail</Link>
                      {r.status === "pending" ? (
                        <>
                          <AlokasiPohonButton
                            id={r.id}
                            jumlah={r.jumlah}
                            programId={r.programId ? Number(r.programId) : null}
                            desa={r.desa}
                            budget={Number(prog?.budget ?? 0)}
                            assetOrigin={ASSET_ORIGIN}
                          />
                          <form action={rejectPesananMitra} className="inline">
                            <input type="hidden" name="id" value={r.id} />
                            <ConfirmSubmit message={`Tolak pesanan ${r.jumlah} pohon dari ${r.mitra_nama}?`} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">
                              Tolak
                            </ConfirmSubmit>
                          </form>
                        </>
                      ) : r.status === "approved" ? (
                        <AlokasiPohonButton
                          id={r.id}
                          jumlah={r.jumlah}
                          programId={r.programId ? Number(r.programId) : null}
                          desa={r.desa}
                          mode="ganti"
                          budget={Number(prog?.budget ?? 0)}
                          assetOrigin={ASSET_ORIGIN}
                        />
                      ) : (
                        <span className="text-[11px] text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              Menampilkan <span className="font-semibold text-zinc-700 dark:text-zinc-200">{shownFrom.toLocaleString("id-ID")}–{shownTo.toLocaleString("id-ID")}</span> dari {total.toLocaleString("id-ID")} pesanan
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link href={buildQuery(currentPage - 1)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Sebelumnya
                </Link>
              )}
              <span className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-900 dark:bg-night-800 dark:text-emerald-200">{currentPage}/{totalPages}</span>
              {currentPage < totalPages && (
                <Link href={buildQuery(currentPage + 1)} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800">
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
