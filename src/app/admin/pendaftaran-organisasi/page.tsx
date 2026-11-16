import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { organisasiSetAction } from "@/lib/actions/mitra";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import Link from "next/link";

export const metadata = { title: "Pendaftaran Organisasi Mitra | Pohon Asuh" };

export default async function AdminPendaftaranOrganisasiPage(props: PageProps<"/admin/pendaftaran-organisasi">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  const status = typeof sp?.status === "string" ? sp.status : "";
  const q = typeof sp?.q === "string" ? sp.q : "";
  const page = Number(sp?.page ?? 1);

  let rows: Record<string, unknown>[] = [];
  let fetchError = false;
  try {
    const base = process.env.API_BASE_URL;
    const key = process.env.ADMIN_API_KEY ?? "";
    const url = new URL(`${base}/organisasiListAdmn`);
    url.searchParams.set("q", q);
    url.searchParams.set("status", status);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "20");
    const res = await fetch(url, { headers: { "X-Admin-Key": key }, cache: "no-store" });
    const json = await res.json();
    rows = json.data ?? [];
  } catch {
    fetchError = true;
  }

  const statusLabel = (v: string) =>
    ({
      pending_email: ["Menunggu OTP", "bg-amber-100 text-amber-800"],
      menunggu_verifikasi: ["Menunggu Verifikasi", "bg-blue-100 text-blue-800"],
      perlu_perbaikan: ["Perlu Perbaikan", "bg-orange-100 text-orange-800"],
      disetujui: ["Disetujui", "bg-emerald-100 text-emerald-800"],
      ditolak: ["Ditolak", "bg-red-100 text-red-800"],
    } as Record<string, [string, string]>)[v] ?? [v, "bg-zinc-100 text-zinc-600"];

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold pa-hgrad">Pendaftaran Organisasi Mitra</h1>
          <p className="mt-1 text-sm text-zinc-500">Verifikasi pendaftaran mitra baru.</p>
        </div>
      </div>

      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">Status pendaftaran diperbarui.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="block text-xs font-medium text-zinc-500">Cari</label>
          <input name="q" defaultValue={q} placeholder="nama / PIC / email / kota…" className="mt-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Status</label>
          <select name="status" defaultValue={status} className="mt-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <option value="">Semua</option>
            {["pending_email","menunggu_verifikasi","perlu_perbaikan","disetujui","ditolak"].map((s) => (
              <option key={s} value={s}>{statusLabel(s)[0]}</option>
            ))}
          </select>
        </div>
        <button className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700" type="submit">Cari</button>
        {q && <Link href="/admin/pendaftaran-organisasi" className="text-xs text-zinc-500 underline">Reset</Link>}
      </form>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat data.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Organisasi</th>
                <th className="px-4 py-3 font-semibold">PIC / Kontak</th>
                <th className="px-4 py-3 font-semibold">Alamat</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {rows.map((r) => (
                <tr key={String(r.id)} className="hover:bg-emerald-50/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-800">{String(r.nama)}</p>
                    <p className="text-xs text-zinc-500">{String(r.jenis)} · {String(r.bidang_kegiatan)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {String(r.nama_pj)}{" "}
                    <span className="block">{String(r.email_pj)}</span>
                    <span className="block">{String(r.hp_pj)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 max-w-[220px] truncate">
                    {String(r.alamat ?? "—")}, {String(r.kota)}, {String(r.provinsi)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusLabel(String(r.status))[1]}`}>
                      {statusLabel(String(r.status))[0]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/pendaftaran-organisasi/${encodeURIComponent(String(r.id))}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        Detail
                      </Link>
                      <form action={organisasiSetAction} className="inline">
                      <input type="hidden" name="idorga" value={String(r.id)} />
                      <select name="aksi" className="rounded-xl border border-zinc-200 px-2 py-1 text-xs">
                        <option value="setujui">Setujui</option>
                        <option value="perbaikan">Minta Perbaikan</option>
                        <option value="tolak">Tolak</option>
                      </select>
                      <input name="note" placeholder="catatan" className="mx-1 rounded-xl border border-zinc-200 px-2 py-1 text-xs" />
                      <ConfirmSubmit message="Teruskan?" className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                        Simpan
                      </ConfirmSubmit>
                    </form>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">{q ? "Tidak ada hasil" : "Belum ada pendaftaran"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
