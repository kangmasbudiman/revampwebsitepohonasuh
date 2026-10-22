import Link from "next/link";
import SuccessPopup from "@/components/admin/success-popup";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapBtors, type ApiBtor } from "@/lib/api";
import BtorTable from "@/components/admin/btor-table";

export const metadata = { title: "Laporan BTOR | Pohon Asuh" };

export default async function AdminBtorPage({
  searchParams,
}: PageProps<"/admin/btor">) {
  const session = await requireAdmin();
  const sp = await searchParams;

  let btor: ApiBtor[] = [];
  let fetchError = false;
  try {
    // Petugas: hanya BTOR miliknya. Admin: semua BTOR (termasuk yang menunggu
    // verifikasi) untuk diperiksa dan disetujui.
    const qs =
      (session.level ?? 1) === 2 ? `?idpetugas=${session.userId}` : "";
    btor = mapBtors(await apiGet<Record<string, unknown>[]>(`btorlist${qs}`));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Laporan BTOR</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {(session.level ?? 1) === 2
              ? "Laporan BTOR hasil tagging Anda — per desa, per petugas."
              : "Laporan BTOR hasil tagging per desa & petugas — periksa, setujui, dan terbitkan memo pencairan."}
          </p>
        </div>
        <Link
          href="/admin/btor/baru"
          data-testid="tambah-btor"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          BTOR Baru
        </Link>
      </div>

      {sp?.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          BTOR dihapus — order di dalamnya kembali jadi kandidat.
        </SuccessPopup>
      )}
      {sp?.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.error)}
        </SuccessPopup>
      )}

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat data BTOR. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      {!fetchError && <BtorTable rows={btor} level={session.level ?? 1} />}
    </main>
  );
}

