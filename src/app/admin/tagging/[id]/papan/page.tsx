import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/guard";
import { apiPost, mapOrderRows, type ApiOrderRow } from "@/lib/api";
import PapanTaging from "@/components/admin/papan-taging";

export const metadata = { title: "Papan Taging | Pohon Asuh" };

export default async function PapanTagingPage({
  params,
}: PageProps<"/admin/tagging/[id]/papan">) {
  const session = await requireAdmin();
  const { id } = await params;

  let orders: ApiOrderRow[] = [];
  try {
    orders = mapOrderRows(
      await apiPost<Record<string, unknown>[]>("ordercustomerbypengurus", {
        iduser: session.userId,
      }),
    ).filter((o) => o.confirmation === "yes");
  } catch {
    notFound();
  }
  const order = orders.find((o) => o.id === Number(id));
  if (!order) notFound();

  const lokasi = [
    order.desa && `Desa ${order.desa}`,
    order.kecamatan && `Kec. ${order.kecamatan}`,
    order.kabupaten && `Kab. ${order.kabupaten}`,
    order.provinsi && `Provinsi ${order.provinsi}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="w-full px-6 py-8 lg:px-10 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Papan Taging</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pratinjau papan yang dicetak lalu ditempel di pohon — desain sama seperti aplikasi
            petugas.
          </p>
        </div>
        <Link
          href="/admin/tagging"
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:bg-night-900 dark:text-emerald-300 dark:hover:bg-night-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Order Tagging
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700 print:hidden">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          {[
            ["Kode Pohon", order.idpohon],
            ["Nama Pohon", order.localName],
            ["Pengasuh", order.nama],
            ["Invoice", order.invoice],
            [
              "Diameter / Tinggi / Keliling",
              `${order.diameter} / ${order.tinggi} / ${order.keliling} Cm`,
            ],
            ["Koordinat", `${order.lat ?? "-"}, ${order.lng ?? "-"}`],
            ["Berlaku sampai", order.tglExp ?? "-"],
            ["Lokasi", lokasi],
          ].map(([label, nilai]) => (
            <div key={label}>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="font-semibold text-zinc-800 dark:text-zinc-100">{nilai || "-"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 print:mt-0">
        <PapanTaging order={order} />
      </div>
    </main>
  );
}
