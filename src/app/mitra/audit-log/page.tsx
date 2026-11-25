import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Riwayat Aktivitas | Pohon Asuh" };

type Row = {
  id: number;
  method: string;
  endpoint: string;
  status: number;
  created_at: string;
  aksi?: string;
};

export default async function MitraAuditLogPage() {
  const session = await requireUser();
  let rows: Row[] = [];
  try {
    const res = await apiPost<{ data?: Row[] }>("auditlogsaya", { idmember: session.userId });
    rows = Array.isArray(res.data) ? res.data : [];
  } catch {}

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold pa-hgrad">
        <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden /> Riwayat Aktivitas Saya
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Catatan aktivitas akun Anda (maksimal 100 aktivitas terakhir).
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aktivitas</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—"}</td>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{r.aksi ?? "Melakukan aktivitas"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${Number(r.status) < 400 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.status}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-zinc-500">Belum ada aktivitas.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
