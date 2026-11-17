import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapTrees, mapProgramMitra, type ApiTree, type ApiProgramMitra } from "@/lib/api";

export const metadata = { title: "Laporan Mitra | Pohon Asuh" };

type Pesanan = { id: number; status: string; jumlah: number; desa: string | null; programId: number | null; programNama: string | null };

export default async function MitraLaporanPage() {
  const session = await requireUser();
  let mitraId: number | null = null, mitraName = "";
  let programs: ApiProgramMitra[] = [];
  let adopsi: Record<string, unknown>[] = [];
  let heldTrees: ApiTree[] = [];
  let pesananRows: Pesanan[] = [];
  try {
    const info = await apiPost<{ value?: number; mitra?: { id: number; nama: string } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama ?? "");
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra);
    }
  } catch {}
  try {
    adopsi = await apiPost<Record<string, unknown>[]>("mitramyadopsi", { idmember: session.userId });
  } catch { adopsi = []; }
  try {
    const res = await apiGet<{ data?: Record<string, unknown>[] }>(`pohonmapall?page=1&per_page=200&status=MITRA`);
    heldTrees = mapTrees(res.data ?? []).filter((t) => t.mitraId === mitraId);
  } catch { heldTrees = []; }
  try {
    const rows = await apiPost<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]>("mitramypesanan", { idmember: session.userId });
    const arr = Array.isArray(rows) ? rows : (rows as { data?: Record<string, unknown>[] }).data ?? [];
    pesananRows = arr.map((r: Record<string, unknown>) => ({
      id: Number(r.id), status: String(r.status ?? "pending"),
      jumlah: Number(r.jumlah) || 0, desa: r.desa ? String(r.desa) : null,
      programId: r.program_id ? Number(r.program_id) : null,
      programNama: r.program_nama ? String(r.program_nama) : null,
    }));
  } catch { pesananRows = []; }

  const verified = adopsi.filter((a) => String(a.certnum ?? "") !== "").length;
  const pendingVerifikasi = adopsi.filter((a) => String(a.certnum ?? "") === "").length;
  const approvedPesanan = pesananRows.filter((p) => p.status === "approved").length;
  const pendingPesanan = pesananRows.filter((p) => p.status === "pending").length;

  const programMap = new Map(programs.map((p) => [p.id, p]));
  const perProgram = programs.map((p) => {
    const kp = adopsi.filter((a) => Number(a.program_id ?? 0) === p.id);
    return {
      nama: p.nama, desa: "",
      adopsi: kp.length, program: p,
    };
  });
  const adGanjil = adopsi.filter((a) => !Number(a.program_id ?? 0)).length;

  return (
    <main className="w-full px-6 py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Laporan Mitra</h1>
          <p className="mt-1 text-sm text-zinc-600">Mitra: <strong>{mitraName}</strong></p>
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${[
            "Program,Nama Pengadopsi,ID Pohon,Certnum,Tgl Adopt",
            ...adopsi.map((a) => {
              const csvEscape = (v: string | null | undefined) => {
                const s = String(v ?? "");
                return s.includes(",") || s.includes("\"") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
              };
              const programName = programMap.get(Number((a as { program_id?: number | string | null }).program_id ?? 0))?.nama ?? "";
              return [
                csvEscape(programName),
                csvEscape(String((a as { nama?: string }).nama ?? "")),
                csvEscape(String((a as { idpohon?: string }).idpohon ?? "")),
                csvEscape(String((a as { certnum?: string }).certnum ?? "")),
                csvEscape(String((a as { tgl_adopt?: string }).tgl_adopt ?? "")),
              ].join(",");
            }),
          ].join("\n")}`}
          className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          download="laporan-mitra.csv"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Program Aktif</p><p className="mt-1 text-2xl font-bold text-emerald-700">{programs.length}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Pohon Ditahan</p><p className="mt-1 text-2xl font-bold text-emerald-700">{heldTrees.length}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Pesanan Disetujui</p><p className="mt-1 text-2xl font-bold text-emerald-700">{approvedPesanan}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Adopsi Tercatat</p><p className="mt-1 text-2xl font-bold text-emerald-700">{adopsi.length}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Sisa Pohon</p><p className="mt-1 text-2xl font-bold text-emerald-700">{Math.max(0, heldTrees.length - adopsi.length)}</p></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Menunggu Persetujuan</p><p className="mt-1 text-2xl font-bold text-amber-600">{pendingPesanan}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Adopsi Pending Veri</p><p className="mt-1 text-2xl font-bold text-amber-600">{pendingVerifikasi}</p></div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4"><p className="text-xs text-zinc-500">Adopsi Terverifikasi</p><p className="mt-1 text-2xl font-bold text-green-600">{verified}</p></div>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
        <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Rekap per Program</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr><th className="px-3 py-2">Program</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Adopsi</th></tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {perProgram.map((row) => (
              <tr key={row.program.id}>
                <td className="px-3 py-2">{row.nama}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">{row.program.tglMulai ?? "—"} → {row.program.tglSelesai ?? "—"}</td>
                <td className="px-3 py-2 font-semibold">{row.adopsi}</td>
              </tr>
            ))}
            {adGanjil > 0 && <tr><td className="px-3 py-2 italic text-zinc-500">Tanpa program</td><td className="px-3 py-2 text-xs text-zinc-400">—</td><td className="px-3 py-2 font-semibold">{adGanjil}</td></tr>}
            {programs.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-zinc-500">Belum ada program.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <h2 className="border-b border-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-night-700 dark:text-emerald-200">
          Data Pengadopsi
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="px-4 py-3">Pengadopsi</th>
                <th className="px-4 py-3">ID Pohon</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Durasi</th>
                <th className="px-4 py-3">Tgl Adopt</th>
                <th className="px-4 py-3">Sertifikat</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {adopsi.map((a, i) => {
                const cert = String((a as { certnum?: string }).certnum ?? "");
                const verified = cert !== "";
                const progNama = programMap.get(Number((a as { program_id?: number | string | null }).program_id ?? 0))?.nama ?? "—";
                return (
                  <tr key={i} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                    <td className="px-4 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">{String((a as { nama?: string }).nama ?? "")}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{String((a as { idpohon?: string }).idpohon ?? "")}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{progNama}</td>
                    <td className="px-4 py-2.5 text-xs">{String((a as { dur?: number | string }).dur ?? "1")} th</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{String((a as { tgl_adopt?: string }).tgl_adopt ?? "—")}</td>
                    <td className="px-4 py-2.5 text-xs">{verified ? cert : "—"}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{verified ? "Terverifikasi" : "Pending Veri"}</span></td>
                  </tr>
                );
              })}
              {adopsi.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Belum ada data pengadopsi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
