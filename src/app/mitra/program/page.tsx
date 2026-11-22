import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapProgramMitra, type ApiProgramMitra } from "@/lib/api";
import { tambahProgramMitraSelf } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";
import AutoDurasi from "@/components/mitra/auto-durasi";
import AnggaranInput from "@/components/mitra/anggaran-input";
import ProvinsiDropdown from "@/components/mitra/provinsi-dropdown";
import ProgramDetailModal from "@/components/mitra/program-detail-modal";
import MitraProgramTable from "@/components/mitra/program-table";
import { History } from "lucide-react";

const ASSET_ORIGIN = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

export const metadata = { title: "Program Saya | Pohon Asuh" };

type MitraInfoRes = { value?: number; mitra?: { id: number; nama: string } };

export default async function MitraProgramPage(props: PageProps<"/mitra/program">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  let programs: ApiProgramMitra[] = [];
  let provinsiList: string[] = [];

  try {
    const info = await apiPost<MitraInfoRes>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra);
      const provRows = await apiGet<string[]>("provinsilist");
      provinsiList = (Array.isArray(provRows) ? provRows : []).map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // bukan mitra
  }
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const detailId = sp?.detail ? Number(Array.isArray(sp.detail) ? sp.detail[0] : sp.detail) : null;
  const detailProg = detailId ? programs.find((p) => p.id === detailId) ?? null : null;

  const created = Boolean(sp?.created);
  const updated = Boolean(sp?.updated);
  const deleted = Boolean(sp?.deleted);
  const error = sp?.error ? String(sp.error) : null;

  const inputCls =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Program Saya</h1>
      <p className="mt-1 text-sm text-zinc-600">Mitra: <strong>{mitraName}</strong></p>

      {created && <SuccessPopup paramKey="created" title="Ditambahkan">Program ditambahkan.</SuccessPopup>}
      {updated && <SuccessPopup paramKey="updated" title="Diperbarui">Program diperbarui.</SuccessPopup>}
      {deleted && <SuccessPopup paramKey="deleted" title="Terhapus">Program dihapus.</SuccessPopup>}
      {error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{error}</SuccessPopup>}

      {/* Buat Program Baru — form server */}
      <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
        <summary className="cursor-pointer font-semibold text-emerald-800">+ Buat Program Baru</summary>
        <AutoDurasi />
        <form action={tambahProgramMitraSelf} className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* Kolom 1 — Program */}
          <div className="min-w-0 space-y-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Nama Program</label>
              <input name="nama" placeholder="Nama program" required className={inputCls} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tanggal Mulai</label>
                <input name="tgl_mulai" id="tgl_mulai" type="date" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tanggal Selesai</label>
                <input name="tgl_selesai" id="tgl_selesai" type="date" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Durasi</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-night-700 dark:bg-night-950/40 dark:text-emerald-200">
                <History className="h-4 w-4 text-emerald-600" aria-hidden />
                <span id="durasi" aria-live="polite"></span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Provinsi</label>
              <ProvinsiDropdown name="provinsi" options={provinsiList} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status</label>
              <select name="aktif" defaultValue="1" className={inputCls}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Logo Program (opsional)</label>
              <input name="logo" type="file" accept="image/*" className="mt-1 w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Deskripsi Program (opsional)</label>
              <textarea name="deskripsi" placeholder="Deskripsi program" className={inputCls} rows={3} />
            </div>
          </div>

          {/* Kolom 2 — Anggaran */}
          <div className="min-w-0">
            <AnggaranInput name="budget" />
          </div>

          <button type="submit" className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Program</button>        </form>
      </details>

      {detailProg && (
        <ProgramDetailModal
          program={detailProg}
          logoUrl={detailProg.logo ? `${ASSET_ORIGIN}/assets/${detailProg.logo}` : null}
        />
      )}

      {/* Tabel program — klik tombol Edit ⇒ popup ProgramEditModal */}
      <MitraProgramTable programs={programs} provinsiList={provinsiList} assetOrigin={ASSET_ORIGIN} />
    </main>
  );
}
