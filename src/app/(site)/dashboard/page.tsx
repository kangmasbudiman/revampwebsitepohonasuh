import Link from "next/link";
import { Bell } from "lucide-react";
import {
  adopsiSlug,
  apiGet,
  apiPost,
  certUrl,
  shareUrl,
  mapAdopsiPohons,
  mapBank,
  mapConfirmations,
  adoptionStatus,
  type ApiAdopsiPohon,
  type ApiBank,
  type ApiConfirmation,
} from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { metodeBayar, namaDesa, rupiah, tanggal, ADOPTION_STATUS } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import StatusBadge from "@/components/status-badge";
import OrderPdfButton from "@/components/order-pdf-button";

export async function generateMetadata() {
  return { title: (await getDict()).dashboard.title };
}

export default async function DashboardPage() {
  const session = await requireUser();
  const d = (await getDict()).dashboard;
  const locale = await getLocale();
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

  // Baris daftar per ORDER (satu invoice satu baris): satu order bisa memuat
  // pohon dari beberapa desa dan tiap desa punya nomor sertifikat sendiri
  // → tombol Sertifikat/Bagikan muncul per lokasi.
  type OrderRow = {
    key: string;
    invoice: string;
    conf: ApiConfirmation | null;
    trees: (typeof rows)[number][];
    status: string;
    subtotal: number;
    tanggal: string | null;
  };
  const orderByKey = new Map<string, OrderRow>();
  for (const r of rows) {
    const key = r.invoice || `id-${r.id}`;
    let o = orderByKey.get(key);
    if (!o) {
      o = {
        key,
        invoice: r.invoice,
        conf: r.conf ?? null,
        trees: [],
        status: r.status,
        subtotal: 0,
        tanggal: r.conf?.tanggal ?? r.tglAdopt ?? null,
      };
      orderByKey.set(key, o);
    }
    if (r.conf) o.conf = r.conf;
    o.trees.push(r);
    o.subtotal += r.price;
    if (!o.tanggal) o.tanggal = r.tglAdopt ?? null;
  }
  const orders = [...orderByKey.values()];

  // Invoice PDF memuat rekening transfer — hanya fetch bila ada order unpaid.
  const adaTagihan = orders.some(
    (o) => o.status === "PENDING_PAYMENT" || o.status === "PENDING_VERIFICATION",
  );
  let banks: ApiBank[] = [];
  if (adaTagihan) {
    try {
      banks = (await apiGet<Record<string, unknown>[]>("getrekening")).map(mapBank);
    } catch {
      // tombol invoice tetap tampil tanpa blok rekening
    }
  }
  const dueStr = (createdAt: string | null) => {
    if (!createdAt) return undefined;
    const t = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(t));
  };

  // Sertifikat diterbitkan per lokasi (dan per penerima hadiah):
  // kelompokkan pohon lunas per certnum.
  const sertifikatPerLokasi = (o: OrderRow) => {
    const perCert = new Map<string, ApiAdopsiPohon[]>();
    for (const t of o.trees) {
      if (!t.certnum) continue;
      const arr = perCert.get(t.certnum) ?? [];
      arr.push(t);
      perCert.set(t.certnum, arr);
    }
    return [...perCert.entries()].map(([certnum, list]) => ({
      certnum,
      desa: list[0].desa,
      jumlah: list.length,
      // Penerima hadiah (nama lain) supaya tombol pembeda dengan lembar sendiri.
      penerima: (list[0].nama ?? "").trim(),
    }));
  };
  const labelSertifikat = (s: { desa: string; jumlah: number; penerima: string }) =>
    `${d.certificate} ${namaDesa(s.desa)}` +
    (s.penerima && s.penerima !== session.name ? ` — ${s.penerima}` : "") +
    ` (${s.jumlah} ${s.jumlah === 1 ? d.treeWord : d.treesWord})`;

  // Tombol aksi dipakai bersama tabel desktop & kartu mobile.
  const aksiAdopsi = (o: OrderRow) => {
    const sertifikat = sertifikatPerLokasi(o);
    return (
      <>
        {o.conf && (
          <Link
            href={`/dashboard/adopsi/${adopsiSlug(o.conf)}`}
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            {d.detail}
          </Link>
        )}
        {o.conf && (o.status === "PENDING_PAYMENT" || o.status === "PENDING_VERIFICATION") && (
          <OrderPdfButton
            mode="invoice"
            compact
            conf={o.conf}
            trees={o.trees}
            name={session.name}
            t={d.invoice}
            banks={banks}
            dueValue={o.status === "PENDING_PAYMENT" ? dueStr(o.conf.createdAt) : undefined}
          />
        )}
        {o.conf && o.status === "ACTIVE" && (
          <OrderPdfButton
            mode="receipt"
            compact
            conf={o.conf}
            trees={o.trees}
            name={session.name}
            t={d.receipt}
            methodValue={metodeBayar(o.conf.methode, locale === "en")}
          />
        )}
        {sertifikat.map((s) => (
          <Link
            key={`cert-${s.certnum}`}
            href={certUrl(s.certnum)}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {labelSertifikat(s)}
          </Link>
        ))}
        {sertifikat.map((s) => (
          <Link
            key={`share-${s.certnum}`}
            href={shareUrl(s.certnum)}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {d.share}
          </Link>
        ))}
      </>
    );
  };

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

      {/* Kartu mobile: kolom aksi tabel lebar 720px tak terlihat di HP tanpa
          scroll horizontal, jadi render ulang sebagai kartu bertumpuk. */}
      <div className="mt-4 space-y-3 md:hidden">
        {orders.map((o) => (
          <div key={o.key} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-zinc-800">
                  {o.invoice || o.trees[0].idpohon}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {o.trees.length} {o.trees.length === 1 ? d.treeWord : d.treesWord}
                </p>
              </div>
              <StatusBadge
                label={statusLabel[o.status] ?? o.status}
                className={ADOPTION_STATUS[o.status]?.className ?? "bg-zinc-100 text-zinc-600"}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {[...new Set(o.trees.map((t) => namaDesa(t.desa)).filter(Boolean))].join(", ")}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-500">
                {o.tanggal ? tanggal(new Date(o.tanggal)) : "—"}
              </span>
              <span className="font-semibold text-emerald-800">{rupiah(o.subtotal)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-emerald-50 pt-3">
              {aksiAdopsi(o)}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="rounded-2xl border border-emerald-100 bg-white px-4 py-10 text-center text-zinc-500">
            {d.empty}{" "}
            <Link href="/pohon" className="font-semibold text-emerald-700 hover:text-emerald-800">
              {d.emptyCta}
            </Link>
          </p>
        )}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-emerald-100 md:block">
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
            {orders.map((o) => (
              <tr key={o.key}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">
                  {o.invoice || o.trees[0].idpohon}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-800">
                    {o.trees.length} {o.trees.length === 1 ? d.treeWord : d.treesWord}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {[...new Set(o.trees.map((t) => namaDesa(t.desa)).filter(Boolean))].join(", ")}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                  {o.tanggal ? tanggal(new Date(o.tanggal)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={statusLabel[o.status] ?? o.status}
                    className={ADOPTION_STATUS[o.status]?.className ?? "bg-zinc-100 text-zinc-600"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-800">
                  {rupiah(o.subtotal)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">{aksiAdopsi(o)}</div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
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
