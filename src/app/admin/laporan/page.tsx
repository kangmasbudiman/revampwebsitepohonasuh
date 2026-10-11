import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapLaporans, type ApiLaporan } from "@/lib/api";
import LaporanTable from "@/components/admin/laporan-table";

export const metadata = { title: "Laporan Kegiatan | Pohon Asuh" };

export default async function AdminLaporanPage({
  searchParams,
}: PageProps<"/admin/laporan">) {
  const session = await requireAdmin();
  const sp = await searchParams;

  let laporan: ApiLaporan[] = [];
  let fetchError = false;
  try {
    // Petugas: semua laporan miliknya (termasuk draf). Admin: SEMUA laporan
    // (draf + terkirim + disetujui) untuk diperiksa dan disetujui.
    const qs =
      (session.level ?? 1) === 2 ? `?idpetugas=${session.userId}` : "";
    laporan = mapLaporans(await apiGet<Record<string, unknown>[]>(`laporanlist${qs}`));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Laporan Kegiatan</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {(session.level ?? 1) === 2
              ? "Laporan kegiatan lapangan Anda."
              : "Semua laporan kegiatan petugas — periksa dan setujui laporan yang sudah dikirim."}
          </p>
        </div>
        <Link
          href="/admin/laporan/baru"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          Tambah Laporan
        </Link>
      </div>

      {sp?.saved && <Banner tone="ok">Laporan tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Laporan dihapus.</Banner>}
      {sp?.disetujui && <Banner tone="ok">Laporan disetujui.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat data laporan. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      {!fetchError && <LaporanTable rows={laporan} level={session.level ?? 1} />}
    </main>
  );
}

function Banner({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600 dark:text-red-400"
      }`}
    >
      {children}
    </p>
  );
}
