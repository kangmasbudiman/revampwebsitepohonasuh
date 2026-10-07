import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { getDict } from "@/lib/i18n";
import { listPesan } from "@/lib/actions/pesan";
import NotifikasiList from "@/components/notifikasi-list";

export async function generateMetadata() {
  return { title: (await getDict()).dashboard.notif.title };
}

export default async function NotifikasiPage() {
  await requireUser();
  const d = (await getDict()).dashboard;
  const rows = await listPesan();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">{d.notif.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{d.notif.sub}</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          {d.backToDashboard}
        </Link>
      </div>
      <div className="mt-6">
        <NotifikasiList rows={rows} />
      </div>
    </main>
  );
}
