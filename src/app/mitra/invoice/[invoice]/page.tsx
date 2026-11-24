import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { apiPost, mapAdopsiPohons, type ApiAdopsiPohon } from "@/lib/api";
import { rupiah, tanggal } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import PrintButton from "@/components/print-button";

export const metadata = { title: "Invoice Adopsi | Pohon Asuh" };

type Invoice = {
  id: number;
  invoice: string;
  tgl: string;
  jml_pohon: number;
  price: number;
  status: string;
  paid?: boolean;
  expired?: boolean;
  created_at?: string | null;
};

export default async function MitraInvoicePage(props: PageProps<"/mitra/invoice/[invoice]">) {
  const { invoice } = await props.params;
  const session = await requireUser();

  let mitraId: number | null = null;
  let mitraName = "";
  let conf: Invoice | null = null;
  let trees: ApiAdopsiPohon[] = [];
  try {
    const info = await apiPost<{ value?: number; mitra?: { id: number; nama: string } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
    }
    if (!mitraId) {
      const { redirect } = await import("next/navigation");
      redirect("/dashboard");
    }

    const slug = invoice.trim().replace(/^#/, "").toUpperCase();
    const res = await apiPost<{ value?: string; data?: Invoice[] }>("mitramyinvoice", { idmember: session.userId });
    const list = Array.isArray(res?.data) ? res.data : [];
    conf =
      list.find((c) => c.invoice.replace(/^#/, "").toUpperCase() === slug) ??
      (/^\d+$/.test(slug) ? (list.find((c) => String(c.id) === slug) ?? null) : null);

    if (conf) {
      const adopts = (await apiPost<Record<string, unknown>[]>("mitramyadopsi", { idmember: session.userId })) ?? [];
      trees = mapAdopsiPohons(adopts).filter((t) => t.invoice === conf!.invoice);
    }
  } catch {
    conf = null;
  }
  if (!conf) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/mitra/tagihan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke Tagihan Saya
        </Link>
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/60 p-8 text-center dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-lg font-bold text-red-800 dark:text-red-200">Invoice tidak ditemukan</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Invoice <span className="font-mono font-semibold">{invoice}</span> tidak ditemukan di data tagihan Anda.
            Bila yakin ini kesalahan, hubungi admin.
          </p>
        </div>
      </main>
    );
  }

  const uniqueTrees = new Map<string, { tree: ApiAdopsiPohon; adopters: string[]; totalPrice: number }>();
  for (const t of trees) {
    const existing = uniqueTrees.get(t.idpohon);
    if (existing) { existing.adopters.push(t.nama ?? "—"); existing.totalPrice += t.price ?? 0; }
    else uniqueTrees.set(t.idpohon, { tree: t, adopters: [t.nama ?? "—"], totalPrice: t.price ?? 0 });
  }
  const grouped = [...uniqueTrees.values()];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <Link href="/mitra/tagihan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke Tagihan Saya
        </Link>
        <PrintButton />
      </div>

      <article className="mt-4 rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm print:mt-0 print:border-0 print:shadow-none">
        {/* Letterhead */}
        <header className="flex items-center justify-between gap-4 border-b-2 border-emerald-600 pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo_icon.png" alt="Pohon Asuh" className="h-14 w-14 rounded-full object-cover" />
            <div>
              <h1 className="text-xl font-extrabold text-emerald-900">Pohon Asuh</h1>
              <p className="text-[11px] text-zinc-500">Jalan Konservasi, Indonesia · info@pohonasuh.io</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Invoice</p>
            <p className="font-mono text-lg font-extrabold text-emerald-900">{conf.invoice}</p>
          </div>
        </header>

        <section className="mt-4 grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase text-zinc-400">Ditagihkan kepada</p>
            <p className="mt-0.5 font-bold text-zinc-800">{mitraName}</p>
            <p className="text-xs text-zinc-500">Mitra Pohon Asuh</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase text-zinc-400">Tanggal</p>
            <p className="mt-0.5 font-bold text-zinc-800">{tanggal(conf.tgl)}</p>
            <p className="text-xs text-zinc-500">{grouped.length} pohon · {trees.length} pengadopsi</p>
          </div>
        </section>

        <div className="mt-4 h-px bg-emerald-100" />

        {grouped.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-[11px] font-semibold uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Kode Pohon</th>
                <th className="py-2 pr-3">Pengadopsi</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {grouped.map(({ tree: t, adopters, totalPrice }) => (
                <tr key={t.idpohon}>
                  <td className="py-2 pr-3 font-mono text-xs">{t.idpohon}</td>
                  <td className="py-2 pr-3 text-xs">{adopters.join(", ")}</td>
                  <td className="py-2 text-right font-semibold">{rupiah(totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-3 text-sm font-bold text-emerald-900">Total Tagihan</td>
                <td className="pt-3 text-right text-lg font-extrabold text-emerald-800">{rupiah(conf.price)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-night-700">
          <p className="text-[11px] font-semibold uppercase text-zinc-500">Pembayaran via Transfer Bank</p>
          <p className="mt-1 text-xs text-zinc-600">a.n. Pohon Asuh · Bank BRI · 0000-0000-0000-0000</p>
          <p className="mt-1 text-xs text-zinc-600">Konfirmasi pembayaran ke admin setelah transfer.</p>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-3 text-center text-[10px] text-zinc-400">
          Invoice ini diterbitkan oleh Pohon Asuh. Terima kasih atas dukungan Anda dalam penghijauan bumi.
        </div>
      </article>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          html, body { background: white !important; }
        }
      `}</style>
    </main>
  );
}
