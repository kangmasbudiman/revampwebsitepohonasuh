import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import { ArrowLeft, Receipt, CheckCircle2, Clock3, TreePine, BadgeCheck, Wallet, BadgeDollarSign } from "lucide-react";

export const metadata = { title: "Tagihan Adopsi | Pohon Asuh" };

type InvoiceItem = {
  id: number;
  invoice: string;
  tgl: string;
  jml_pohon: number;
  price: number;
  paid: boolean;
  created_at: string | null;
};

export default async function MitraTagihanPage() {
  const session = await requireUser();

  let mitraId: number | null = null;
  let mitraName = "";
  let items: InvoiceItem[] = [];
  let summary = { total_invoice: 0, total_pohon: 0, total: 0, lunas: 0, belum: 0 };
  let fetchError = false;

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

  try {
    const res = await apiPost<{
      value?: string | number;
      summary?: typeof summary;
      data?: InvoiceItem[];
    }>("mitramyinvoice", { idmember: session.userId });
    if (res.summary) summary = res.summary;
    items = Array.isArray(res.data) ? res.data : [];
  } catch {
    fetchError = true;
  }

  const fmtDate = (raw: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw.length === 10 ? raw + "T00:00:00" : raw.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };
  const fmtRp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <main className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/mitra" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />Kembali ke dashboard
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold pa-hgrad"><Receipt className="h-7 w-7 text-emerald-600" aria-hidden />Tagihan Adopsi Saya</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Mitra: <strong>{mitraName}</strong> · setiap simpan adopsi menerbitkan 1 invoice</p>
        </div>
      </header>

      {/* Statistik */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700">
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><TreePine className="h-4 w-4 text-emerald-600" aria-hidden />Pohon Dipesan</p>
          <p className="mt-0.5 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{summary.total_pohon.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700">
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Receipt className="h-4 w-4 text-emerald-600" aria-hidden />Total Invoice</p>
          <p className="mt-0.5 text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">{summary.total_invoice.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-4 dark:border-night-700">
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden />Lunas</p>
          <p className="mt-0.5 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{fmtRp(summary.lunas)}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 pa-card p-4 dark:border-amber-900/60">
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500"><Clock3 className="h-4 w-4 text-amber-600" aria-hidden />Belum Dilunasi</p>
          <p className="mt-0.5 text-2xl font-extrabold text-amber-700 dark:text-amber-400">{fmtRp(summary.belum)}</p>
        </div>
      </div>

      {fetchError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat tagihan.</p>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center">
          <Wallet className="h-10 w-10 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">Belum ada tagihan</p>
          <p className="max-w-sm text-xs text-zinc-500">Setiap Anda simpan adopsi (Data Pengadopsi), akan muncul invoice otomatis di sini.</p>
          <Link href="/mitra/adopsi" className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">+ Input Adopsi</Link>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 grid gap-3 md:hidden">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-emerald-100 pa-card p-4 shadow-sm dark:border-night-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">{it.invoice}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{fmtDate(it.created_at)}</p>
                  </div>
                  {it.paid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Lunas</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase text-amber-800"><Clock3 className="h-3.5 w-3.5" aria-hidden />Belum</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-emerald-50 pt-3 dark:border-night-800">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">{it.jml_pohon.toLocaleString("id-ID")} pohon × harga × durasi</span>
                  <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">{fmtRp(it.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700 md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Pohon</th>
                  <th className="px-4 py-3 font-semibold">Rincian</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-200">{it.invoice}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">{fmtDate(it.created_at)}</td>
                    <td className="px-4 py-3 font-semibold">{it.jml_pohon.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">harga × durasi per pohon</td>
                    <td className="px-4 py-3 font-extrabold text-emerald-900 dark:text-emerald-200">{fmtRp(it.price)}</td>
                    <td className="px-4 py-3">
                      {it.paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Lunas</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase text-amber-800"><Clock3 className="h-3.5 w-3.5" aria-hidden />Belum</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <BadgeDollarSign className="h-4 w-4" aria-hidden />Tagihan dibayarkan oleh mitra ke Pohon Asuh sesuai nominal di atas. Sertifikat terbit setelah admin memverifikasi data adopsi Anda.
          </p>
        </>
      )}
    </main>
  );
}
