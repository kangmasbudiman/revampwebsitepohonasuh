import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { listPesan } from "@/lib/actions/pesan";
import NotifikasiList from "@/components/notifikasi-list";

export const metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  await requireUser();
  const rows = await listPesan();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Notifikasi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Kabar terbaru tentang order dan adopsi pohon Anda.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
      <div className="mt-6">
        <NotifikasiList rows={rows} />
      </div>
    </main>
  );
}
