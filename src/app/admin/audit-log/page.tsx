import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Admin — Audit Log" };

type Row = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  role: string;
  method: string;
  endpoint: string;
  ip: string | null;
  status: number;
  created_at: string;
  aksi?: string;
};

export default async function AdminAuditLogPage(props: PageProps<"/admin/audit-log">) {
  await requireAdminLevel();
  const sp = await props.searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const role = typeof sp?.role === "string" ? sp.role : "";
  const page = Number(sp?.page ?? 1) || 1;

  let rows: Row[] = [];
  let total = 0;
  let fetchError = false;
  try {
    const key = process.env.ADMIN_API_KEY ?? "";
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const res = await apiGet<{ data?: Row[]; total?: number }>(`auditlog?${params.toString()}`, {
      "X-Admin-Key": key,
    });
    rows = Array.isArray(res.data) ? res.data : [];
    total = Number(res.total ?? 0);
  } catch {
    fetchError = true;
  }

  const buildQuery = (nextPage: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    p.set("page", String(nextPage));
    return `/admin/audit-log?${p.toString()}`;
  };

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold pa-hgrad">
        <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden /> Audit Log
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Semua aktivitas tulis (tambah/ubah/hapus) oleh admin, mitra, dan user tercatat di sini.
      </p>

      <form method="get" className="mt-5 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Cari nama / endpoint / ID user…" className="w-64 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
        <select name="role" defaultValue={role} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
          <option value="">Semua role</option>
          <option value="admin">Admin</option>
          <option value="mitra">Mitra</option>
          <option value="user">User</option>
          <option value="sistem">Sistem</option>
        </select>
        <button type="submit" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">Filter</button>
      </form>

      {fetchError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat audit log.</p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Aktivitas</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—"}</td>
                    <td className="px-4 py-3 font-medium">{r.user_name ?? "sistem"} {r.user_id ? <span className="font-mono text-[10px] text-zinc-400">#{r.user_id}</span> : null}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.role === "admin" ? "bg-emerald-100 text-emerald-700" : r.role === "mitra" ? "bg-sky-100 text-sky-700" : "bg-zinc-100 text-zinc-600"}`}>{r.role}</span></td>
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{r.aksi ?? "Melakukan aktivitas"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{r.ip ?? "—"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${Number(r.status) < 400 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{r.status}</span></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Belum ada aktivitas.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
            <span>Total {total} aktivitas</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildQuery(page - 1)} className="rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-700">Sebelumnya</Link>}
              <span className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">{page}</span>
              {rows.length >= 30 && <Link href={buildQuery(page + 1)} className="rounded-xl border border-emerald-200 px-3 py-2 font-semibold text-emerald-700">Berikutnya</Link>}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
