import Link from "next/link";
import { ArrowLeft, Banknote, CheckCircle2, Clock } from "lucide-react";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapPembayaranRows, type ApiPembayaranRow } from "@/lib/api";
import { rupiah } from "@/lib/format";
import PembayaranTable from "@/components/admin/pembayaran-table";

export const metadata = { title: "Pencatatan Keuangan | Pohon Asuh" };

// Pencatatan Keuangan: pembayaran pohon yang sudah ditagging. Daftar pohon
// dihitung HIDUP dari data tagging (kriteria sama dengan chip "Sudah
// ditagging" di /admin/tagging) — begitu petugas mengunggah foto tagging,
// pohon otomatis muncul di sini menunggu dicatat pembayarannya.
export default async function PembayaranTaggingPage({
  searchParams,
}: PageProps<"/admin/keuangan/pembayaran">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let rows: ApiPembayaranRow[] = [];
  let fetchError = false;
  try {
    rows = mapPembayaranRows(
      await apiGet<{ value?: number; data?: Record<string, unknown>[] }>("pembayaranlist"),
    );
  } catch {
    fetchError = true;
  }

  const belum = rows.filter((r) => !r.dibayar);
  const sudah = rows.filter((r) => r.dibayar);
  const totalDibayar = sudah.reduce((s, r) => s + (r.bayar?.jumlah ?? 0), 0);

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href="/admin/keuangan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Keuangan
      </Link>
      <h1 className="mt-4 text-2xl font-bold pa-hgrad">Pencatatan Keuangan</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Pembayaran pohon yang sudah ditagging. Daftar di bawah sinkron otomatis dengan status
        tagging petugas — penerima terisi otomatis dari petugas desa yang ditugaskan.
      </p>

      {sp?.saved && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Pembayaran tersimpan.
        </p>
      )}
      {sp?.deleted && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Catatan pembayaran dihapus — pohon kembali berstatus belum dibayar.
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {String(sp.error)}
        </p>
      )}
      {fetchError && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data pembayaran. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Total dibayarkan
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {rupiah(totalDibayar)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {sudah.length.toLocaleString("id-ID")} pohon sudah dibayar
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 pa-card p-5 shadow-sm dark:border-night-700">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Belum dibayar
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-300">
            {belum.length.toLocaleString("id-ID")} pohon
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Sudah ditagging, menunggu dicatat</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Progres pembayaran
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-50">
            {rows.length > 0 ? Math.round((sudah.length / rows.length) * 100) : 0}%
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-night-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              style={{ width: `${rows.length > 0 ? (sudah.length / rows.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <PembayaranTable rows={rows} />
    </main>
  );
}
