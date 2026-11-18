import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { requireAdminLevel } from "@/lib/guard";
import { treePhotoUrl } from "@/lib/api";
import SuccessPopup from "@/components/admin/success-popup";
import { approvePesananMitra, rejectPesananMitra } from "@/lib/actions/mitra";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import {
  ArrowLeft,
  TreePine,
  CalendarDays,
  User,
  Tags,
  MapPin,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { namaDesa } from "@/lib/format";
import type { OrderTreeMini } from "@/lib/api";

export const metadata = { title: "Detail Pesanan Mitra | Pohon Asuh" };

type OrderData = {
  id: number;
  mitra_nama: string;
  mitra_slug: string | null;
  member_nama: string;
  member_email: string;
  program_nama: string | null;
  desa: string | null;
  pohon_pilihan: string | null;
  jumlah: number;
  catatan: string | null;
  status: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const STATUS_LABEL: Record<string, [string, string]> = {
  pending: ["Menunggu Persetujuan", "bg-amber-100 text-amber-800"],
  approved: ["Disetujui", "bg-emerald-100 text-emerald-800"],
  rejected: ["Ditolak", "bg-red-100 text-red-800"],
  cancelled: ["Dibatalkan", "bg-zinc-100 text-zinc-600"],
};

function fmtWaktu(s: string | null): string {
  if (!s) return "—";
  if (s.startsWith("0000")) return "—";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminPesananMitraDetailPage(props: PageProps<"/admin/pesanan-mitra/[id]">) {
  await requireAdminLevel();
  const { id: idParam } = await props.params;
  const sp = await props.searchParams;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const base = process.env.API_BASE_URL;
  const key = process.env.ADMIN_API_KEY ?? "";

  let order: OrderData | null = null;
  let trees: OrderTreeMini[] = [];
  let fetchError: string | null = null;
  try {
    const res = await fetch(`${base}/mitradetailpesanan?id=${id}`, { headers: { "X-Admin-Key": key }, cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      order = (json.data as OrderData) ?? null;
      trees = Array.isArray(json.trees) ? (json.trees as OrderTreeMini[]) : [];
    } else {
      fetchError = json?.pesan ?? `Gagal memuat (HTTP ${res.status})`;
    }
  } catch {
    fetchError = "Gagal menghubungi server API.";
  }
  if (!fetchError && !order) notFound();

  const status = order ? STATUS_LABEL[order.status] ?? [order.status, "bg-zinc-100 text-zinc-600"] : ["", ""];

  return (
    <main className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <Link href="/admin/pesanan-mitra" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />Kembali ke daftar pesanan
      </Link>

      {sp?.approved && <SuccessPopup paramKey="approved" title="Disetujui">Pesanan disetujui &amp; pohon dialokasikan.</SuccessPopup>}
      {sp?.rejected && <SuccessPopup paramKey="rejected" title="Ditolak">Pesanan ditolak.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {fetchError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{fetchError}</p>
      ) : order && (
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {/* Kolom ringkasan */}
          <div className="lg:col-span-1 space-y-4">
            {/* Identitas */}
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm dark:border-night-700 dark:bg-night-900">
              <div className="h-2 w-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-500" />
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Pesanan #{order.id}</p>
                <h1 className="mt-1 text-xl font-extrabold text-emerald-950 dark:text-emerald-100 break-words">{order.mitra_nama}</h1>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${status[1]}`}>{status[0]}</span>

                <div className="mt-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"><User className="h-3.5 w-3.5" aria-hidden />Akun pemesan</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{order.member_nama}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500"><Mail className="h-3.5 w-3.5" aria-hidden />{order.member_email}</p>
                </div>
                <dl className="mt-4">
                  {order.desa && (
                    <div className="flex items-start justify-between gap-4 border-b border-emerald-50 py-2.5 text-xs last:border-0 dark:border-night-800"><dt className="inline-flex items-center gap-1 text-zinc-400"><MapPin className="h-3.5 w-3.5" />Desa</dt><dd className="text-right font-semibold">{namaDesa(order.desa)}</dd></div>
                  )}
                  {order.program_nama && (
                    <div className="flex items-start justify-between gap-4 border-b border-emerald-50 py-2.5 text-xs last:border-0 dark:border-night-800"><dt className="inline-flex items-center gap-1 text-zinc-400"><Tags className="h-3.5 w-3.5" />Program</dt><dd className="text-right font-semibold">{order.program_nama}</dd></div>
                  )}
                  <div className="flex items-start justify-between gap-4 border-b border-emerald-50 py-2.5 text-xs last:border-0 dark:border-night-800"><dt className="inline-flex items-center gap-1 text-zinc-400"><CalendarDays className="h-3.5 w-3.5" />Tanggal pesanan</dt><dd className="text-right font-semibold">{fmtWaktu(order.created_at)}</dd></div>
                  {order.approved_at && (
                    <div className="flex items-start justify-between gap-4 border-b border-emerald-50 py-2.5 text-xs last:border-0 dark:border-night-800"><dt className="inline-flex items-center gap-1 text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" />Disetujui oleh</dt><dd className="text-right font-semibold">{order.approved_by_name ?? `Admin #${order.approved_by}`} · {fmtWaktu(order.approved_at)}</dd></div>
                  )}
                  <div className="flex items-start justify-between gap-4 py-2.5 text-xs"><dt className="inline-flex items-center gap-1 text-zinc-400"><TreePine className="h-3.5 w-3.5" />Jumlah diminta</dt><dd className="text-right text-base font-extrabold text-emerald-800">{order.jumlah} pohon</dd></div>
                </dl>
                {order.catatan && (
                  <div className="mt-3 rounded-xl bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:bg-night-800 dark:text-emerald-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-300">Catatan</p>
                    <p className="mt-1 whitespace-pre-line">{order.catatan}</p>
                  </div>
                )}
              </div>
              {order.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2 border-t border-emerald-100 bg-emerald-50/40 px-5 py-4 dark:border-night-700 dark:bg-night-800/40">
                  <form action={approvePesananMitra}>
                    <input type="hidden" name="id" value={order.id} />
                    <button type="submit" className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Setujui &amp; Alokasikan</button>
                  </form>
                  <form action={rejectPesananMitra}>
                    <input type="hidden" name="id" value={order.id} />
                    <ConfirmSubmit message={`Tolak pesanan ${order.jumlah} pohon dari ${order.mitra_nama}?`} className="inline-flex rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400">Tolak</ConfirmSubmit>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Pohon */}
          <div className="lg:col-span-2 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3 dark:border-night-700">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-200"><TreePine className="h-4 w-4" aria-hidden />Pohon yang Dipesan</h2>
              <span className="text-xs font-semibold text-zinc-500">{trees.length} pohon{order.jumlah !== trees.length ? ` (diminta ${order.jumlah})` : ""}</span>
            </div>

            {trees.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500">
                {order.pohon_pilihan ? "Pohon pilihan belum dialokasikan." : "Pesanan ini akan dialokasikan otomatis saat disetujui."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 xl:grid-cols-4">
                {trees.map((t) => (
                  <div key={t.code} className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm dark:border-night-700 dark:bg-night-900">
                    <div className="relative h-24 bg-emerald-50 sm:h-28">
                      {t.photoUrl ? (
                        <Image src={treePhotoUrl(t.photoUrl)} alt={t.localName} fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw" className="object-cover" />
                      ) : (
                        <TreePine className="absolute inset-0 m-auto h-8 w-8 text-emerald-300" aria-hidden />
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-emerald-950 dark:text-emerald-100">{t.localName}</span>
                        <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-800 dark:bg-night-800 dark:text-emerald-300">{t.code}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] italic text-zinc-500">{t.species ?? "—"}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">📍 {t.desa ? namaDesa(t.desa) : "—"} · Ø {t.diameterCm ?? "—"} cm{t.heightM != null ? ` · T ${t.heightM} m` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
