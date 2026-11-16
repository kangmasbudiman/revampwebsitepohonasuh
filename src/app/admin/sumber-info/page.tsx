import { requireAdminLevel } from "@/lib/guard";
import { mapSumberInfo, type ApiSumberInfo } from "@/lib/api";
import SumberInfoChart from "@/components/admin/sumber-info-chart";

export const metadata = { title: "Sumber Info Pengguna | Pohon Asuh" };

export default async function AdminSumberInfoPage(props: PageProps<"/admin/sumber-info">) {
  await requireAdminLevel();
  const sp = await props.searchParams;
  const q = typeof sp?.q === "string" ? sp.q : "";
  const page = Number(sp?.page ?? 1);

  let rows: ApiSumberInfo[] = [];
  let total = 0;
  let summary: Record<string, number> = {};
  let fetchError = false;
  try {
    const base = process.env.API_BASE_URL;
    const key = process.env.ADMIN_API_KEY ?? "";
    const res = await fetch(`${base}/sumberinfoadmn?q=${encodeURIComponent(q)}&page=${page}&per_page=50`, {
      headers: { "X-Admin-Key": key },
      cache: "no-store",
    });
    const json = await res.json();
    rows = (json.data ?? []).map(mapSumberInfo);
    total = Number(json.total) || 0;
    summary = json.summary ?? {};
  } catch {
    fetchError = true;
  }

  const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);
  const label: Record<string, string> = {
    pencarian_google: "Pencarian Google",
    asisten_ai: "Asisten AI",
    rekomendasi_teman: "Rekomendasi Teman",
    berita_artikel: "Berita / Artikel",
    facebook: "Facebook",
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    x_twitter: "X (Twitter)",
    dari_mulut_ke_mulut: "Dari mulut ke mulut",
    lainnya: "Lainnya",
  };
  const tl = (v: string) => label[v] ?? v;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Sumber Info Pengguna</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Dari mana pengguna tahu tentang Pohon Asuh — jawaban pilihan tunggal.
        {total > 0 && <span className="ml-1 font-semibold text-emerald-800 dark:text-emerald-300">· {total.toLocaleString("id-ID")} pengguna sudah menjawab{q ? ` (terfilter)` : ""}</span>}
      </p>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sorted.map(([key, val]) => (
          <div key={key} className="rounded-2xl border border-emerald-100 pa-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{val}</p>
            <p className="text-[11px] text-zinc-500">{tl(key)}</p>
          </div>
        ))}
        {sorted.length === 0 && <p className="col-span-6 text-sm text-zinc-500">Belum ada data.</p>}
      </div>

      {!fetchError && <SumberInfoChart summary={summary} />}

      {/* Search & Table */}
      <form method="get" className="mt-6 flex items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Cari nama / email…" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
        <button type="submit" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Cari</button>
      </form>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat data.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Email / HP</th>
                <th className="px-4 py-3 font-semibold">Alamat</th>
                <th className="px-4 py-3 font-semibold">Sumber Info</th>
                <th className="px-4 py-3 font-semibold">Tgl Daftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{r.emaile}{r.hp ? <span className="block">{r.hp}</span> : null}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-500">{r.alamat ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-800">{tl(r.sumberInfo)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{r.tanggal ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">{q ? "Tidak ada hasil" : "Belum ada data"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
