import Link from "next/link";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapPenugasan, type ApiPenugasan } from "@/lib/api";
import BtorForm from "@/components/admin/btor-form";

export const metadata = { title: "BTOR Baru | Pohon Asuh" };

export default async function BtorBaruPage() {
  const session = await requireAdmin();

  let penugasan: ApiPenugasan = { desa: [], petugas: [] };
  try {
    penugasan = mapPenugasan(await apiGet<Record<string, unknown>>("penugasandesa"));
  } catch {
    penugasan = { desa: [], petugas: [] };
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="w-full">
        <Link
          href="/admin/btor"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          ← Daftar Laporan BTOR
        </Link>
        <h1 className="mt-3 text-xl font-bold pa-hgrad">BTOR Baru</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Susun laporan BTOR dari order tagging yang sudah selesai — per desa, per petugas.
        </p>
        <div className="mt-5 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <BtorForm
            penugasan={penugasan}
            level={session.level ?? 1}
            petugasSaya={{ id: session.userId, nama: session.name }}
          />
        </div>
      </div>
    </main>
  );
}
