import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { apiPost } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { namaDesa, rupiah } from "@/lib/format";
import { updateOrderMemo } from "@/lib/actions/order";

export const metadata = { title: "Koreksi Order | Pohon Asuh" };

type Row = {
  id: number;
  invoice: string;
  idpohon: string;
  localName: string;
  desa: string;
  nama: string;
  namaMember: string;
  memo: string | null;
  proses: number;
  price: number;
  tglAdopt: string | null;
  tglExp: string | null;
};

const PROSES_LABEL: Record<number, string> = {
  0: "Selesai",
  1: "Menunggu verifikasi",
  2: "Menunggu tagging",
  3: "Terverifikasi",
};

export default async function KoreksiOrderPage(
  props: PageProps<"/admin/order/[invoice]">,
) {
  await requireAdminLevel();
  const { invoice } = await props.params;
  const inv = decodeURIComponent(invoice);
  const sp = await props.searchParams;

  let rows: Row[] = [];
  try {
    rows = (await apiPost<Record<string, unknown>[]>("orderbyinvoice", { invoice: inv })).map(
      (r) => ({
        id: Number(r.id),
        invoice: String(r.invoice ?? ""),
        idpohon: String(r.idpohon ?? ""),
        localName: String(r.localname ?? "-"),
        desa: String(r.desa ?? "-"),
        nama: String(r.nama ?? ""),
        namaMember: String(r.nama_member ?? "-"),
        memo: r.memo ? String(r.memo) : null,
        proses: Number(r.proses ?? 0),
        price: Number(r.price ?? 0),
        tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
        tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
      }),
    );
  } catch {
    // notFound di bawah
  }
  if (rows.length === 0) notFound();

  const first = rows[0];
  const total = rows.reduce((s, r) => s + r.price, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-10">
      <Link
        href="/admin/sertifikat"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Sertifikat
      </Link>

      <h1 className="mt-4 text-2xl font-bold pa-hgrad">
        Koreksi Order {first.invoice}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Nama penerima & memo tercetak pada sertifikat. Perubahan berlaku untuk{" "}
        {rows.length} pohon dalam invoice ini.
      </p>

      {sp.saved && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          Perubahan tersimpan — sertifikat kini memakai data baru.
        </p>
      )}
      {sp.error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {String(sp.error)}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full text-left text-sm">
          <thead className="pa-thead text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Pohon</th>
              <th className="px-4 py-3">Desa</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Harga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  {r.idpohon}
                </td>
                <td className="px-4 py-3 text-zinc-800 dark:text-zinc-100">{r.localName}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{namaDesa(r.desa)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-night-700 dark:text-zinc-300">
                    {PROSES_LABEL[r.proses] ?? `Proses ${r.proses}`}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-800 dark:text-emerald-300">
                  {rupiah(r.price)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-emerald-100 dark:border-night-700">
              <td colSpan={4} className="px-4 py-3 text-right text-sm text-zinc-500 dark:text-zinc-400">
                Total invoice
              </td>
              <td className="px-4 py-3 text-right font-bold text-emerald-800 dark:text-emerald-300">
                {rupiah(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <form
        action={updateOrderMemo}
        className="mt-8 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700"
      >
        <input type="hidden" name="invoice" value={first.invoice} />
        <h2 className="text-lg font-bold pa-hgrad">
          Nama penerima & memo sertifikat
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Nama donatur akun: {first.namaMember}. Kosongkan nama penerima hanya bila
          memang tidak ingin dicetak.
        </p>

        <label className="mt-5 block text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          Nama penerima sertifikat
          <input
            name="nama"
            defaultValue={first.nama}
            required
            maxLength={100}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          Memo (kalimat pengiring di sertifikat — opsional)
          <textarea
            name="memo"
            defaultValue={first.memo ?? ""}
            rows={3}
            maxLength={200}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </label>

        <button
          type="submit"
          className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          Simpan Perubahan
        </button>
      </form>
    </main>
  );
}
