import { apiGet } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { verifikasiPerpanjangan } from "@/lib/actions/perpanjangan";
import { CalendarClock } from "lucide-react";

export const metadata = { title: "Admin — Perpanjangan Program" };

type Row = {
  id: number;
  program_id: number;
  tgl_selesai_lama: string | null;
  tgl_selesai_baru: string;
  alasan: string | null;
  status: string;
  verified_at: string | null;
  program_nama?: string | null;
  mitra_nama?: string | null;
};

const STATUS: Record<string, [string, string]> = {
  menunggu: ["Menunggu Verifikasi", "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"],
  disetujui: ["Disetujui", "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"],
  ditolak: ["Ditolak", "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"],
};

export default async function AdminPerpanjanganPage(props: PageProps<"/admin/perpanjangan">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let rows: Row[] = [];
  try {
    const key = process.env.ADMIN_API_KEY ?? "";
    const res = await apiGet<{ data?: Row[] }>("daftarperpanjanganadmin", { "X-Admin-Key": key });
    rows = Array.isArray(res.data) ? res.data : [];
  } catch {
    // tampilkan daftar kosong
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold pa-hgrad">
        <CalendarClock className="h-7 w-7 text-emerald-600" aria-hidden /> Perpanjangan Program
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Setujui atau tolak pengajuan perpanjangan masa program dari mitra. Jika disetujui, tanggal selesai dan durasi program otomatis diperbarui.
      </p>

      {sp?.disetujui === "1" && <SuccessPopup paramKey="disetujui" title="Disetujui">Perpanjangan disetujui — program diperpanjang.</SuccessPopup>}
      {sp?.ditolak === "1" && <SuccessPopup paramKey="ditolak" tone="err" title="Ditolak">Pengajuan perpanjangan ditolak.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Mitra</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Masa Program</th>
              <th className="px-4 py-3">Alasan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {rows.map((r) => {
              const lbl = STATUS[r.status] ?? [r.status, "bg-zinc-100 text-zinc-600"];
              return (
                <tr key={r.id} className={r.status === "menunggu" ? "bg-amber-50/60 dark:bg-amber-950/10" : ""}>
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{r.mitra_nama ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-200">{r.program_nama ?? `#${r.program_id}`}</td>
                  <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                    {r.tgl_selesai_lama ?? "—"} <span className="text-zinc-400">→</span>{" "}
                    <strong className="text-emerald-700">{r.tgl_selesai_baru}</strong>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-500" title={r.alasan ?? ""}>{r.alasan || "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${lbl[1]}`}>{lbl[0]}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.status === "menunggu" ? (
                      <div className="flex justify-end gap-2">
                        <form action={verifikasiPerpanjangan}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="disetujui" />
                          <button type="submit" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Setujui</button>
                        </form>
                        <form action={verifikasiPerpanjangan}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="ditolak" />
                          <button type="submit" className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">Tolak</button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Belum ada pengajuan perpanjangan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
