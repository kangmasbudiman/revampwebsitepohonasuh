import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapProgramMitra, type ApiProgramMitra } from "@/lib/api";
import { tambahProgramMitraSelf, editProgramMitraSelf } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";
import AutoDurasi from "@/components/mitra/auto-durasi";

const ASSET_ORIGIN = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

export const metadata = { title: "Program Saya | Pohon Asuh" };

type MitraInfoRes = { value?: number; mitra?: { id: number; nama: string } };

function formatBudget(v: number | null | undefined): string {
  const n = v ? Number(v) : 0;
  if (!n || n <= 0) return "—";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatProvinsi(v: string | null | undefined): string {
  const list = String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list.join(", ") : "—";
}

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

  const editId = sp?.edit ? Number(Array.isArray(sp.edit) ? sp.edit[0] : sp.edit) : null;
  const detailId = sp?.detail ? Number(Array.isArray(sp.detail) ? sp.detail[0] : sp.detail) : null;
  const editProg = editId ? programs.find((p) => p.id === editId) ?? null : null;
  const detailProg = detailId ? programs.find((p) => p.id === detailId) ?? null : null;

  const created = Boolean(sp?.created);
  const updated = Boolean(sp?.updated);
  const error = sp?.error ? String(sp.error) : null;

  const inputCls =
    "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Program Saya</h1>
      <p className="mt-1 text-sm text-zinc-600">Mitra: <strong>{mitraName}</strong></p>

      {created && <SuccessPopup paramKey="created" title="Ditambahkan">Program ditambahkan.</SuccessPopup>}
      {updated && <SuccessPopup paramKey="updated" title="Diperbarui">Program diperbarui.</SuccessPopup>}
      {error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{error}</SuccessPopup>}

      {editProg && sp?.edit ? (
        <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <summary className="cursor-pointer font-semibold text-emerald-800">+ Edit Program</summary>
          <AutoDurasi />
          <form action={editProgramMitraSelf} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={editProg.id} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Nama Program</label>
              <input name="nama" defaultValue={editProg.nama} required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Durasi</label>
              <input name="durasi" id="durasi" defaultValue={editProg.durasi ?? ""} placeholder="Durasi kegiatan (mis. 3 bulan / 20 hari)" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status</label>
              <select name="aktif" defaultValue={editProg.aktif ? "1" : "0"} className={inputCls}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tanggal Mulai</label>
              <input name="tgl_mulai" id="tgl_mulai" type="date" defaultValue={editProg.tglMulai ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tanggal Selesai</label>
              <input name="tgl_selesai" id="tgl_selesai" type="date" defaultValue={editProg.tglSelesai ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Budget Program</label>
              <input name="budget" type="number" min="0" step="0.01" defaultValue={editProg.budget ?? undefined} placeholder="0" className={inputCls} />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Provinsi</label>
              <select
                name="provinsi"
                multiple
                defaultValue={editProg.provinsi ? String(editProg.provinsi).split(",").map((s) => s.trim()).filter(Boolean) : []}
                className={inputCls}
              >
                {provinsiList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Logo Program (opsional)</label>
              <input name="logo" type="file" accept="image/*" className="mt-1 w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Deskripsi Program (opsional)</label>
              <textarea name="deskripsi" defaultValue={editProg.deskripsi ?? ""} placeholder="Deskripsi program" className={inputCls} rows={3} />
            </div>
            <button type="submit" className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Perubahan</button>
          </form>
        </details>
      ) : (
        <details className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <summary className="cursor-pointer font-semibold text-emerald-800">+ Buat Program Baru</summary>
          <AutoDurasi />
          <form action={tambahProgramMitraSelf} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Nama Program</label>
              <input name="nama" placeholder="Nama program" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Durasi</label>
              <input name="durasi" id="durasi" placeholder="Durasi kegiatan (mis. 3 bulan / 20 hari)" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Status</label>
              <select name="aktif" defaultValue="1" className={inputCls}>
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tanggal Mulai</label>
              <input name="tgl_mulai" id="tgl_mulai" type="date" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tanggal Selesai</label>
              <input name="tgl_selesai" id="tgl_selesai" type="date" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Budget Program</label>
              <input name="budget" type="number" min="0" step="0.01" placeholder="0" className={inputCls} />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Provinsi</label>
              <select name="provinsi" multiple className={inputCls} aria-label="Provinsi program">
                {provinsiList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
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
            <button type="submit" className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Program</button>
          </form>
        </details>
      )}

      {detailProg && (
        <div className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Program #{detailProg.id}</p>
              <h2 className="mt-1 text-xl font-extrabold text-emerald-950">{detailProg.nama}</h2>
              <p className="mt-1 text-sm text-zinc-600">Status: {detailProg.aktif ? "Aktif" : "Nonaktif"}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/mitra/program?edit=${detailProg.id}`} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Edit</Link>
              <Link href="/mitra/program" className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Tutup</Link>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-zinc-500">Periode:</span> {detailProg.tglMulai ?? "—"} → {detailProg.tglSelesai ?? "—"} {detailProg.durasi && <span className="block text-zinc-400">{detailProg.durasi}</span>}</div>
            <div><span className="text-zinc-500">Budget:</span> {formatBudget(detailProg.budget)}</div>
            <div><span className="text-zinc-500">Provinsi:</span> {formatProvinsi(detailProg.provinsi)}</div>
            <div><span className="text-zinc-500">Deskripsi:</span> {detailProg.deskripsi ?? "—"}</div>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-4 py-3 font-semibold">No</th>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Nama Program</th>
              <th className="px-4 py-3 font-semibold">Periode / Durasi</th>
              <th className="px-4 py-3 font-semibold">Budget</th>
              <th className="px-4 py-3 font-semibold">Provinsi</th>
              <th className="px-4 py-3 font-semibold">Logo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {programs.map((p, i) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.nama}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.tglMulai ?? "—"} → {p.tglSelesai ?? "—"}
                  {p.durasi && <span className="block text-zinc-400">{p.durasi}</span>}
                </td>
                <td className="px-4 py-2 text-[11px] whitespace-nowrap">{formatBudget(p.budget)}</td>
                <td className="px-4 py-3 text-xs">{formatProvinsi(p.provinsi)}</td>
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
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/mitra/program?detail=${p.id}`} className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Detail</Link>
                    <Link href={`/mitra/program?edit=${p.id}`} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-500">Belum ada program. Buat di atas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
