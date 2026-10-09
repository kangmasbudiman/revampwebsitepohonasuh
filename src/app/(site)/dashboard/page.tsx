import Link from "next/link";
import { Bell } from "lucide-react";
import {
  apiPost,
  certUrl,
  mapAdopsiPohons,
  mapConfirmations,
  adoptionStatus,
  type ApiAdopsiPohon,
  type ApiConfirmation,
} from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { namaDesa, rupiah, tanggal, ADOPTION_STATUS } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import StatusBadge from "@/components/status-badge";

export async function generateMetadata() {
  return { title: (await getDict()).dashboard.title };
}

export default async function DashboardPage() {
  const session = await requireUser();
  const d = (await getDict()).dashboard;
  const statusLabel: Record<string, string> = {
    PENDING_PAYMENT: d.statusPendingPayment,
    PENDING_VERIFICATION: d.statusPendingVerification,
    ACTIVE: d.statusActive,
    CANCELLED: d.statusCancelled,
  };

  let confs: ApiConfirmation[] = [];
  let trees: ApiAdopsiPohon[] = [];
  try {
    confs = mapConfirmations(
      await apiPost<Record<string, unknown>[]>("getconfirmasi", { idmember: session.userId }),
    );
    trees = mapAdopsiPohons(
      await apiPost<Record<string, unknown>[]>("mytrees", { iduser: session.userId }),
    );
  } catch {
    // tampilkan daftar kosong di bawah
  }

  const confByInvoice = new Map(confs.map((c) => [c.invoice, c]));
  const rows = trees.map((t) => {
    const conf = confByInvoice.get(t.invoice);
    const status = conf
      ? adoptionStatus(conf.confirmation, !!conf.fotoUrl)
      : t.certnum
        ? ("ACTIVE" as const)
        : ("PENDING_PAYMENT" as const);
    return { ...t, conf, status };
  });

  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const pending = rows.filter(
    (r) => r.status === "PENDING_PAYMENT" || r.status === "PENDING_VERIFICATION",
  ).length;
  const totalContribution = confs
    .filter((c) => c.confirmation === "yes")
    .reduce((sum, c) => sum + c.price, 0);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950">
            {d.hello}, {session.name}
          </h1>
          <p className="mt-1 text-zinc-600">{d.helloSub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/notifikasi"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <Bell className="h-4 w-4" />
            {d.notifications}
          </Link>
          <Link
            href="/pohon"
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {d.adoptNew}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">{d.statActive}</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{active}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6">
          <p className="text-sm text-zinc-500">{d.statOngoing}</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">{d.statContribution}</p>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{rupiah(totalContribution)}</p>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-emerald-950">{d.myAdoptions}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-emerald-50 text-emerald-900">
            <tr>
              <th className="px-4 py-3 font-semibold">{d.colCode}</th>
              <th className="px-4 py-3 font-semibold">{d.colTree}</th>
              <th className="px-4 py-3 font-semibold">{d.colDate}</th>
              <th className="px-4 py-3 font-semibold">{d.colStatus}</th>
              <th className="px-4 py-3 text-right font-semibold">{d.colFee}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 bg-white">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.idpohon}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-800">{r.localName}</p>
                  <p className="text-xs text-zinc-500">{namaDesa(r.desa)}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                  {r.tglAdopt ? tanggal(new Date(r.tglAdopt)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={statusLabel[r.status] ?? r.status}
                    className={ADOPTION_STATUS[r.status]?.className ?? "bg-zinc-100 text-zinc-600"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-800">
                  {rupiah(r.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {r.conf && (
                      <Link
                        href={`/dashboard/adopsi/${r.conf.id}`}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        {d.detail}
                      </Link>
                    )}
                    {r.certnum && (
                      <Link
                        href={certUrl(r.certnum)}
                        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        {d.certificate}
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  {d.empty}{" "}
                  <Link href="/pohon" className="font-semibold text-emerald-700 hover:text-emerald-800">
                    {d.emptyCta}
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
