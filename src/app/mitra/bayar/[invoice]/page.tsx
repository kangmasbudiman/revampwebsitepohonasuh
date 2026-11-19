import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapBank, mapAdopsiPohons, type ApiAdopsiPohon, type ApiBank } from "@/lib/api";
import { rupiah, tanggal } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import OnlinePayment from "@/components/online-payment";
import PaymentForm from "@/components/payment-form";
import CancelAdoptionButton from "@/components/cancel-adoption-button";

export const metadata = { title: "Pembayaran Adopsi | Pohon Asuh" };

export default async function MitraBayarPage(props: PageProps<"/mitra/bayar/[invoice]">) {
  const { invoice } = await props.params;
  const session = await requireUser();

  let mitraId: number | null = null;
  let mitraName = "";
  try {
    const info = await apiPost<{ value?: number; mitra?: { id: number; nama: string } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
    }
  } catch {}
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  type MitraInvoice = {
    id: number;
    invoice: string;
    tgl: string;
    jml_pohon: number;
    price: number;
    status: string;
    paid: boolean;
    expired: boolean;
    link_invoice?: string;
    bukti?: string;
    created_at?: string | null;
  };

  let conf: MitraInvoice | null = null;
  let trees: ApiAdopsiPohon[] = [];
  let banks: ApiBank[] = [];
  try {
    const slug = invoice.trim().replace(/^#/, "").toUpperCase();
    const res = await apiPost<{ value?: string; data?: MitraInvoice[] }>(
      "mitramyinvoice",
      { idmember: session.userId },
    );
    const list = Array.isArray(res?.data) ? res.data : [];
    conf =
      list.find((c) => c.invoice.replace(/^#/, "").toUpperCase() === slug) ??
      (/^\d+$/.test(slug) ? (list.find((c) => String(c.id) === slug) ?? null) : null);
    if (conf) {
      const adopts = (await apiPost<Record<string, unknown>[]>("mitramyadopsi", { idmember: session.userId })) ?? [];
      trees = mapAdopsiPohons(adopts).filter((t) => t.invoice === conf!.invoice);
      banks = (await apiGet<Record<string, unknown>[]>("getrekening")).map(mapBank);
    }
  } catch {
    conf = null;
  }
  if (!conf) notFound();

  const s = conf.paid ? ("ACTIVE" as const) : conf.bukti ? ("PENDING_VERIFICATION" as const) : conf.expired ? ("CANCELLED" as const) : ("PENDING_PAYMENT" as const);

  const batas = conf.created_at ? new Date(new Date(conf.created_at).getTime() + 24 * 60 * 60 * 1000) : null;
  const batasStr = batas ? batas.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + " " + batas.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

  const uniqueTrees = new Map<string, { tree: ApiAdopsiPohon; adopters: string[]; totalPrice: number }>();
  for (const t of trees) {
    const existing = uniqueTrees.get(t.idpohon);
    if (existing) { existing.adopters.push(t.nama ?? "—"); existing.totalPrice += t.price ?? 0; }
    else uniqueTrees.set(t.idpohon, { tree: t, adopters: [t.nama ?? "—"], totalPrice: t.price ?? 0 });
  }
  const grouped = [...uniqueTrees.values()];
  
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/mitra/tagihan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />Kembali ke Tagihan Saya
      </Link>

      {/* Header invoice */}
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Invoice {conf.invoice}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 dark:text-emerald-100">Pembayaran Order Adopsi</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Mitra: <strong>{mitraName}</strong></p>
          </div>
          {s === "ACTIVE" ? (
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase text-emerald-800">Lunas</span>
          ) : s === "PENDING_VERIFICATION" ? (
            <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-bold uppercase text-blue-800">Verifikasi Admin</span>
          ) : s === "CANCELLED" ? (
            <span className="rounded-full bg-red-100 px-4 py-2 text-xs font-bold uppercase text-red-800">Kadaluarsa</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase text-amber-800">Menunggu Bayar</span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-emerald-50 bg-emerald-50/30 p-4 text-sm sm:grid-cols-4 dark:border-night-800">
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Tanggal</dt><dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{tanggal(conf.tgl)}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Pohon</dt><dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{grouped.length} pohon</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Pengadopsi</dt><dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{trees.length} orang</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Total</dt><dd className="mt-0.5 font-extrabold text-emerald-800 dark:text-emerald-300">{rupiah(conf.price)}</dd></div>
        </dl>

        {grouped.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Kode Pohon</th>
                  <th className="py-2 pr-3">Pengadopsi</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-night-800">
                {grouped.map(({ tree: t, adopters, totalPrice }) => (
                  <tr key={t.idpohon}>
                    <td className="py-2 pr-3 font-mono text-xs">{t.idpohon}</td>
                    <td className="py-2 pr-3 text-xs">{adopters.join(", ")}</td>
                    <td className="py-2 text-right font-semibold">{rupiah(totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {s === "PENDING_PAYMENT" && batas && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/40">
            <span className="text-xl leading-none" aria-hidden>⏰</span>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">Batas waktu pembayaran 1×24 jam</p>
              <p className="mt-1 text-xs leading-5 text-amber-800/90 dark:text-amber-300">Order otomatis dibatalkan pada <strong>{batasStr}</strong> bila belum dibayar.</p>
            </div>
          </div>
        )}

        {s === "PENDING_PAYMENT" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Bayar Online (Mayar) */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 dark:border-night-700 dark:bg-night-800/40">
              <h2 className="font-bold text-emerald-900 dark:text-emerald-200">Bayar Online (QRIS)</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Scan QRIS / pilih VA — terverifikasi otomatis.</p>
              <div className="mt-3">
                <OnlinePayment confirmationId={conf.id} linkInvoice={conf.link_invoice ? conf.link_invoice : null} />
              </div>
            </div>
            {/* Transfer Bank */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 dark:border-night-700 dark:bg-night-900">
              <h2 className="font-bold text-amber-900 dark:text-amber-200">Transfer Bank</h2>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">Unggah bukti transfer di bawah ini.</p>
              <div className="mt-3 space-y-3">
                {banks.map((bank) => (
                  <div key={bank.id} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-night-800 dark:bg-night-800/50">
                    <p className="text-[10px] font-semibold uppercase text-zinc-500">{bank.bankName}</p>
                    <p className="mt-0.5 font-mono text-base font-extrabold text-emerald-950 dark:text-emerald-100">{bank.accountNumber}</p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">a.n. {bank.accountName}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <PaymentForm confirmationId={conf.id} />
              </div>
            </div>
          </div>
        )}

        {s === "PENDING_PAYMENT" && (
            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-night-800">
              <CancelAdoptionButton confirmationId={conf.id} />
            </div>
        )}

        {s === "PENDING_VERIFICATION" && (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/60 dark:bg-blue-950/30">
            <h2 className="font-bold text-blue-900 dark:text-blue-200">Menunggu Verifikasi Admin</h2>
            <p className="mt-1 text-sm leading-6 text-blue-900/80 dark:text-blue-300">Bukti pembayaran Anda sudah kami terima dan sedang diverifikasi admin.</p>
          </div>
        )}
      </div>
    </main>
  );
}
