import Link from "next/link";
import { requireAdmin } from "@/lib/guard";
import { apiGet, getKandidatPohon, mapLokasi } from "@/lib/api";
import LaporanForm from "@/components/admin/laporan-form";

export const metadata = { title: "Tambah Laporan Kegiatan | Pohon Asuh" };

export default async function LaporanBaruPage() {
  const session = await requireAdmin();

  let desaList: { nama: string; label: string }[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa"))
      .map(mapLokasi)
      .map((d) => ({ nama: d.nama, label: d.label || d.nama }));
  } catch {
    desaList = [];
  }
  const kandidatPohon = await getKandidatPohon().catch(() => []);

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="w-full">
        <Link
          href="/admin/laporan"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          ← Daftar Laporan Kegiatan
        </Link>
        <h1 className="mt-3 text-xl font-bold pa-hgrad">Laporan Kegiatan</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Ceritakan kegiatan yang sudah dilakukan menggunakan dukungan dana Pohon Asuh.
        </p>
        <div className="mt-5 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <LaporanForm
            desaList={desaList}
            level={session.level ?? 1}
            kandidatPohon={kandidatPohon}
          />
        </div>
      </div>
    </main>
  );
}
