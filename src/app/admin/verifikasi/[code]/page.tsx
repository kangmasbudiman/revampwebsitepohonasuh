import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, mapOrderRows, type ApiOrderRow } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { namaDesa, rupiah } from "@/lib/format";
import VerifyPanel from "@/components/verify-panel";

export default async function VerificationDetailPage(
  props: PageProps<"/admin/verifikasi/[code]">,
) {
  const { code } = await props.params;
  await requireAdminLevel();

  let rows: ApiOrderRow[] = [];
  try {
    rows = mapOrderRows(await apiGet<Record<string, unknown>[]>("ordercustomer"));
  } catch {
    // notFound di bawah yang menangani
  }

  const orderRows = rows.filter((r) => r.confirmasiId === Number(code));
  if (orderRows.length === 0 || orderRows[0].confirmation !== "no" || !orderRows[0].fotoBuktiUrl) {
    notFound();
  }

  const subtotal = orderRows.reduce((sum, r) => sum + r.price, 0);
  const total = orderRows[0].total;
  const unique = Math.max(0, total - subtotal);
  const foto = orderRows[0].fotoBuktiUrl;
  const nama = orderRows[0].nama;
  const invoice = orderRows[0].invoice;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href="/admin/verifikasi"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        ← Kembali ke daftar verifikasi
      </Link>

      <h1 className="mt-4 text-2xl font-bold pa-hgrad">Verifikasi {invoice}</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
            <h2 className="font-semibold pa-hgrad">Donatur</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Nama</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-100">{nama}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Invoice</dt>
                <dd className="font-mono text-xs text-zinc-800 dark:text-zinc-100">{invoice}</dd>
              </div>
            </dl>
            <Link
              href={`/admin/order/${encodeURIComponent(invoice)}`}
              className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Koreksi nama penerima & memo →
            </Link>
          </div>

          <div className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
            <h2 className="font-semibold pa-hgrad">Pohon ({orderRows.length})</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {orderRows.map((r) => (
                <div key={r.id} className="flex justify-between gap-4">
                  <dt className="text-zinc-600 dark:text-zinc-300">
                    {r.localName} <span className="text-zinc-400 dark:text-zinc-500">({r.idpohon})</span> · {namaDesa(r.desa)}
                  </dt>
                  <dd className="whitespace-nowrap text-zinc-800 dark:text-zinc-100">{rupiah(r.price)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 dark:border-night-800">
                <dt className="text-zinc-500 dark:text-zinc-400">Subtotal</dt>
                <dd className="text-zinc-800 dark:text-zinc-100">{rupiah(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Kode unik</dt>
                <dd className="font-bold text-amber-600">{unique}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 dark:border-night-800">
                <dt className="font-medium text-zinc-700 dark:text-zinc-200">Total seharusnya</dt>
                <dd className="font-bold text-emerald-700">{rupiah(total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
            <h2 className="font-semibold pa-hgrad">Bukti Transfer</h2>
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={foto}
                alt={`Bukti transfer ${invoice}`}
                className="mt-3 w-full rounded-xl border border-zinc-100 object-contain dark:border-night-700"
              />
            ) : (
              <p className="mt-3 rounded-xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Donatur tidak melampirkan bukti gambar.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
            <h2 className="font-semibold pa-hgrad">Tindakan</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Verifikasi akan menandai pohon sebagai teradopsi dan menerbitkan sertifikat.
            </p>
            <div className="mt-4">
              <VerifyPanel confirmasiId={Number(code)} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
