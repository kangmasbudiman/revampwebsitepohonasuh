import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { apiGet, buktiUrl } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { verifikasiAdopsiMitraAction } from "@/lib/actions/mitra";
import { BadgeCheck, SearchX, Leaf } from "lucide-react";
import PhotoLightbox from "@/components/admin/photo-lightbox";

export const metadata = { title: "Verifikasi Adopsi Mitra | Pohon Asuh" };

type PendingAdopsi = { id: number; nama: string; email: string | null; idpohon: string; desa: string | null; dur: number; tgl_adopt: string | null; memo: string | null; program_id: number | null };
type PendingInvoice = {
  confirmasi_id: number;
  invoice: string;
  mitra: string;
  tgl: string | null;
  jumlah: number;
  adopsi: PendingAdopsi[];
  bukti?: string | null;
  price?: number;
};

type DpRow = {
  id: number;
  invoice: string | null;
  jumlah: number | string;
  bukti: string | null;
  status: string;
  metode?: string;
};

export default async function VerifikasiAdopsiMitraPage(props: PageProps<"/admin/verifikasi-adopsi-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";

  let data: PendingInvoice[] = [];
  let totalInvoice = 0;
  let totalPohon = 0;
  let fetchError: string | null = null;
  let dpsByInvoice = new Map<string, DpRow[]>();
  try {
    const key = process.env.ADMIN_API_KEY ?? "";
    const dpRes = await apiGet<{ data?: DpRow[] }>("daftardpadmin", { "X-Admin-Key": key });
    for (const d of dpRes.data ?? []) {
      if (!d.invoice) continue;
      const k = String(d.invoice).replace(/^#/, "").toUpperCase();
      dpsByInvoice.set(k, [...(dpsByInvoice.get(k) ?? []), d]);
    }
  } catch {}
  try {
    const base = process.env.API_BASE_URL;
    const key = process.env.ADMIN_API_KEY ?? "";
    const url = `${base}/adosimitrapending?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "X-Admin-Key": key }, cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      data = (json.data ?? []) as PendingInvoice[];
      totalInvoice = Number(json.total_invoice ?? 0);
      totalPohon = Number(json.total_pohon ?? 0);
    } else {
      fetchError = json?.pesan ?? `Gagal memuat (HTTP ${res.status})`;
    }
  } catch {
    fetchError = "Gagal menghubungi server API.";
  }

  return (
    <main className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <h1 className="flex items-center gap-3 text-2xl font-bold pa-hgrad"><BadgeCheck className="h-7 w-7 text-emerald-600" aria-hidden />Verifikasi Adopsi Mitra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Data pengadopsi yang diinput mitra — verifikasi terlebih dahulu sebelum sertifikat &amp; tagging diproses.
        Setelah diverifikasi, nomor sertifikat terbit otomatis dan mitra menerima notifikasi.
      </p>

      {sp?.verified && <SuccessPopup paramKey="verified" title="Terverifikasi">Adopsi diverifikasi — sertifikat terbit &amp; mitra menerima notifikasi.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800"><Leaf className="h-4 w-4" aria-hidden />{totalInvoice} invoice menunggu · {totalPohon} pohon</span>
      </div>

      <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Cari mitra / invoice / nama pengadopsi / kode pohon…" className="w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
        <button type="submit" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">Cari</button>
        {q && <Link href="/admin/verifikasi-adopsi-mitra" className="text-xs text-zinc-500 underline">Reset</Link>}
      </form>

      {fetchError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{fetchError}</p>
      ) : data.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center">
          <SearchX className="h-10 w-10 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">{q ? `Tidak ada hasil untuk “${q}”` : "Belum ada adopsi mitra menunggu verifikasi"}</p>
          <p className="max-w-md text-xs text-zinc-500">Mitra menginput data pengadopsi lewat menu Input Adopsi Mitra — daftar di sini menunggu tindakan Anda.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {data.map((inv) => (
            <section key={inv.confirmasi_id} className="overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 dark:border-night-700 dark:bg-emerald-950/20 sm:px-5">
                <div className="flex items-center gap-3">
                  {inv.bukti ? (
                    <PhotoLightbox
                      src={inv.bukti}
                      alt={`Bukti transfer ${inv.invoice}`}
                      triggerClassName="block h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-emerald-200 bg-white transition-opacity hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={inv.bukti} alt={`Bukti transfer ${inv.invoice}`} className="h-full w-full object-contain" />
                    </PhotoLightbox>
                  ) : (
                    <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-amber-300 bg-amber-50 text-[9px] font-semibold uppercase text-amber-700">Tanpa bukti</span>
                  )}
                  <div>
                    <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{inv.mitra}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Invoice <span className="font-mono">{inv.invoice}</span> · {inv.tgl ?? "—"} · {inv.jumlah} pohon · <strong className="text-emerald-800">{rupiah(inv.price ?? 0)}</strong></p>
                    {inv.bukti
                      ? <PhotoLightbox src={inv.bukti} alt={`Bukti transfer ${inv.invoice}`} triggerClassName="text-[11px] font-semibold text-emerald-700 underline decoration-emerald-300 hover:text-emerald-800">Lihat bukti transfer</PhotoLightbox>
                      : <span className="text-[11px] text-amber-700">Belum ada bukti (kemungkinan QRIS/Mayar)</span>}
                        {(() => {
                          const list = dpsByInvoice.get(inv.invoice.replace(/^#/, "").toUpperCase()) ?? [];
                          if (list.length === 0) return null;
                          return (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {list.map((d, n) => {
                                const lbl = d.status === "disetujui"
                                  ? ["Disetujui", "bg-emerald-100 text-emerald-700"]
                                  : d.status === "ditolak"
                                    ? ["Ditolak", "bg-red-100 text-red-700"]
                                    : ["Menunggu", "bg-amber-100 text-amber-700"];
                                const link = buktiUrl(d.bukti);
                                return (
                                  <span key={d.id} className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-2 py-1 dark:border-night-700">
                                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200">DP {n + 1}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lbl[1]}`}>{lbl[0]} · {rupiah(Number(d.jumlah))}</span>
                                    {d.metode === "online" ? (
                                      <span className="text-[10px] font-semibold text-emerald-700">via Mayar</span>
                                    ) : link ? (
                                      <PhotoLightbox src={link} alt={`Bukti DP ${n + 1} ${inv.invoice}`} triggerClassName="text-[10px] font-semibold text-emerald-700 underline">Lihat bukti DP {n + 1}</PhotoLightbox>
                                    ) : null}
                                  </span>
                                );
                              })}
                              <Link href="/admin/verifikasi-dp" className="text-[11px] font-semibold text-emerald-700 underline">Kelola DP →</Link>
                            </div>
                          );
                        })()}
                  </div>
                </div>
                <form action={verifikasiAdopsiMitraAction}>
                  <input type="hidden" name="invoice" value={inv.invoice} />
                  <ConfirmSubmit message={`Verifikasi ${inv.jumlah} adopsi dari ${inv.mitra}? Sertifikat akan terbit.`} confirmLabel="Ya, Verifikasi" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                    <BadgeCheck className="h-4 w-4" aria-hidden />Verifikasi &amp; Terbitkan Sertifikat
                  </ConfirmSubmit>
                </form>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-emerald-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-night-700 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Pengadopsi</th>
                      <th className="px-4 py-2.5 font-semibold">Email</th>
                      <th className="px-4 py-2.5 font-semibold">ID Pohon</th>
                      <th className="px-4 py-2.5 font-semibold">Desa</th>
                      <th className="px-4 py-2.5 font-semibold">Durasi</th>
                      <th className="px-4 py-2.5 font-semibold">Tgl Adopt</th>
                      <th className="px-4 py-2.5 font-semibold">Memo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                    {inv.adopsi.map((a) => (
                      <tr key={a.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/40">
                        <td className="px-4 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">{a.nama}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{a.email}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{a.idpohon}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{a.desa ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs">{a.dur} th</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{a.tgl_adopt ?? "—"}</td>
                        <td className="max-w-[180px] truncate px-4 py-2.5 text-xs text-zinc-500" title={a.memo ?? ""}>{a.memo ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
