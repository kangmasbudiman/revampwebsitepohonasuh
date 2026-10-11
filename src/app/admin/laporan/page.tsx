import { requireAdmin } from "@/lib/guard";
import { apiGet, mapLaporans, mapLokasi, type ApiLaporan } from "@/lib/api";
import LaporanForm from "@/components/admin/laporan-form";
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
    // Petugas hanya melihat laporan miliknya; admin melihat semua petugas.
    const qs = (session.level ?? 1) === 2 ? `?idpetugas=${session.userId}` : "";
    laporan = mapLaporans(await apiGet<Record<string, unknown>[]>(`laporanlist${qs}`));
  } catch {
    fetchError = true;
  }

  let desaList: { nama: string; label: string }[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa"))
      .map(mapLokasi)
      .map((d) => ({ nama: d.nama, label: d.label || d.nama }));
  } catch {
    desaList = [];
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Laporan Kegiatan</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {(session.level ?? 1) === 2
              ? "Laporan kegiatan lapangan Anda."
              : "Laporan kegiatan seluruh petugas tagging."}
          </p>
        </div>
      </div>

      {sp?.saved && <Banner tone="ok">Laporan tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Laporan dihapus.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Laporan
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <LaporanForm desaList={desaList} />
        </div>
      </details>

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
