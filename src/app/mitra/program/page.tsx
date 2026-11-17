import Image from "next/image";
import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapProgramMitra, type ApiProgramMitra } from "@/lib/api";
import { tambahProgramMitraSelf } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";

const ASSET_ORIGIN = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

export const metadata = { title: "Program Saya | Pohon Asuh" };

export default async function MitraProgramPage(props: PageProps<"/mitra/program">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  let programs: ApiProgramMitra[] = [];
  try {
    const info = await apiPost<{ value?: number; mitra?: { id: number; nama: string } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra);
    }
  } catch {
    // bukan mitra
  }
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Program Saya</h1>
      <p className="mt-1 text-sm text-zinc-600">Mitra: <strong>{mitraName}</strong></p>

      {sp?.created && <SuccessPopup paramKey="created" title="Ditambahkan">Program ditambahkan.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
        <summary className="cursor-pointer font-semibold text-emerald-800">+ Buat Program Baru</summary>
        <form action={tambahProgramMitraSelf} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="nama" placeholder="Nama program" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="durasi" placeholder="Durasi kegiatan (mis. 3 bulan)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="tgl_mulai" type="date" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="tgl_selesai" type="date" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Logo Program (opsional)</label>
            <input name="logo" type="file" accept="image/*" className="mt-1 w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700" />
          </div>
          <select name="aktif" defaultValue="1" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
          <textarea name="deskripsi" placeholder="Deskripsi program (opsional)" className="sm:col-span-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" rows={3} />
          <button type="submit" className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Program</button>
        </form>
      </details>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nama Program</th>
              <th className="px-4 py-3 font-semibold">Periode / Durasi</th>
              <th className="px-4 py-3 font-semibold">Logo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {programs.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.nama}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.tglMulai ?? "—"} → {p.tglSelesai ?? "—"}
                  {p.durasi && <span className="block text-zinc-400">{p.durasi}</span>}
                </td>
                <td className="px-4 py-3">
                  {p.logo ? (
                    <Image
                      src={`${ASSET_ORIGIN}/assets/${p.logo}`}
                      alt={`Logo ${p.nama}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-xl border border-emerald-100 bg-white object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.aktif ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {p.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Belum ada program. Buat di atas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
