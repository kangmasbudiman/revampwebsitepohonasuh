import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapProgramMitra } from "@/lib/api";
import { rupiah, tanggal } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import DpForm from "@/components/mitra/dp-form";
import OnlinePaymentDp from "@/components/mitra/online-payment-dp";

export const metadata = { title: "Pembayaran DP | Pohon Asuh" };

type Invoice = {
  id: number;
  invoice: string;
  tgl: string;
  jml_pohon: number;
  price: number;
  status?: string;
  paid?: boolean;
  expired?: boolean;
  created_at: string | null;
};

type DpPesanan = {
  id: number;
  program_id: number | null;
  program_nama: string | null;
  jumlah: number;
  status: string;
  dp_status: string | null;
  budget: number | null;
};

type DpRow = {
  id: number;
  pesanan_id: number;
  jumlah: number | string;
  bukti: string | null;
  status: string;
  created_at: string;
  program_nama?: string | null;
};

// Halaman pembayaran DP — dibuka dari tombol "Bayar DP" di Tagihan Adopsi.
export default async function MitraBayarDpPage(props: PageProps<"/mitra/bayar-dp/[invoice]">) {
  const { invoice } = await props.params;
  const session = await requireUser();
  const slug = invoice.trim().replace(/^#/, "").toUpperCase();

  let mitraId: number | null = null;
  let mitraName = "";
  let conf: Invoice | null = null;
  let pesanans: DpPesanan[] = [];
  let dps: DpRow[] = [];

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

    const [invRes, riwayat, prows, dpRes] = await Promise.all([
      apiPost<{ data?: Invoice[] }>("mitramyinvoice", { idmember: session.userId }),
      apiPost<{ data?: Record<string, unknown>[] }>("mitrariwayatpesanan", { idmember: session.userId, status: "semua", q: "", page: 1, per_page: 50 }),
      apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`),
      apiPost<{ data?: DpRow[] }>("daftardp", { idmember: session.userId }),
    ]);

    const list = Array.isArray(invRes.data) ? invRes.data : [];
    conf = list.find((c) => c.invoice.replace(/^#/, "").toUpperCase() === slug) ?? null;

    const budgets = new Map(prows.map(mapProgramMitra).map((p) => [p.id, p.budget]));
    pesanans = (Array.isArray(riwayat.data) ? riwayat.data : [])
      .filter((r) => r.status !== "dihapus")
      .map((r) => ({
        id: Number(r.id),
        program_id: r.program_id ? Number(r.program_id) : null,
        program_nama: r.program_nama ? String(r.program_nama) : null,
        jumlah: Number(r.jumlah ?? 0),
        status: String(r.status ?? ""),
        dp_status: r.dp_status ? String(r.dp_status) : null,
        budget: r.program_id ? budgets.get(Number(r.program_id)) ?? null : null,
      }));
    dps = Array.isArray(dpRes.data) ? dpRes.data : [];
  } catch {
    conf = null;
  }
  if (!conf) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/mitra/tagihan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />Kembali ke Tagihan Saya
      </Link>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Invoice {conf.invoice}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 dark:text-emerald-100">Pembayaran DP</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Mitra: <strong>{mitraName}</strong> · ajukan uang muka pesanan pohon untuk diverifikasi admin.</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-emerald-50 bg-emerald-50/30 p-4 text-sm sm:grid-cols-4 dark:border-night-800">
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Tanggal</dt><dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{tanggal(conf.tgl)}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Pohon</dt><dd className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">{conf.jml_pohon} pohon</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Total Tagihan</dt><dd className="mt-0.5 font-extrabold text-emerald-800 dark:text-emerald-300">{rupiah(conf.price)}</dd></div>
          <div><dt className="text-[10px] font-semibold uppercase text-zinc-400">Status</dt><dd className="mt-0.5 font-semibold text-amber-700">{conf.paid ? "Lunas" : conf.expired ? "Kadaluarsa" : "Belum dibayar"}</dd></div>
        </dl>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 dark:border-night-700 dark:bg-night-800/40">
            <OnlinePaymentDp pesanans={pesanans} invoice={conf.invoice} />
          </div>
        <div className="h-full min-w-0">
          <DpForm pesanans={pesanans} dps={dps} title="Transfer Bank" />
        </div>
        </div>
      </div>
    </main>
  );
}
