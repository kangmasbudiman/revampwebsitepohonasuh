import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  apiGet,
  apiPost,
  adoptionStatus,
  certUrl,
  mapAdopsiPohons,
  mapBank,
  mapConfirmations,
  mapTaggingTrees,
  type ApiAdopsiPohon,
  type ApiBank,
  type ApiConfirmation,
  type ApiTaggingTree,
} from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { absoluteUrl } from "@/lib/site-url";
import { namaDesa, rupiah, tanggal, ADOPTION_STATUS } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import StatusBadge from "@/components/status-badge";
import PaymentForm from "@/components/payment-form";
import OnlinePayment from "@/components/online-payment";
import CancelAdoptionButton from "@/components/cancel-adoption-button";
import TaggingProgress from "@/components/tagging-progress";
import GiftSend from "@/components/gift-send";

export default async function AdoptionDetailPage(props: PageProps<"/dashboard/adopsi/[code]">) {
  const { code } = await props.params;
  const session = await requireUser();
  const d = (await getDict()).dashboard;
  const locale = await getLocale();
  const statusLabel: Record<string, string> = {
    PENDING_PAYMENT: d.statusPendingPayment,
    PENDING_VERIFICATION: d.statusPendingVerification,
    ACTIVE: d.statusActive,
    CANCELLED: d.statusCancelled,
  };

  let conf: ApiConfirmation | null = null;
  let trees: ApiAdopsiPohon[] = [];
  let banks: ApiBank[] = [];
  let tagging: ApiTaggingTree[] | null = null;
  try {
    const confs = mapConfirmations(
      await apiPost<Record<string, unknown>[]>("getconfirmasi", { idmember: session.userId }),
    );
    conf = confs.find((c) => c.id === Number(code)) ?? null;
    if (conf) {
      trees = mapAdopsiPohons(
        await apiPost<Record<string, unknown>[]>("mytrees", { iduser: session.userId }),
      ).filter((t) => t.invoice === conf!.invoice);
      banks = (await apiGet<Record<string, unknown>[]>("getrekening")).map(mapBank);
      try {
        tagging = mapTaggingTrees(
          await apiPost<Record<string, unknown>[]>("fototagingorder", { invoice: conf!.invoice }),
        );
      } catch {
        // fail-soft: pakai fallback dari mytrees di bawah
      }
    }
  } catch {
    // notFound di bawah yang menangani
  }
  if (!conf) notFound();
  if (tagging === null) {
    tagging = trees.map((t) => ({
      idadopsi: t.id,
      idpohon: t.idpohon,
      localName: t.localName,
      desa: t.desa,
      proses: t.proses,
      foto: [],
    }));
  }

  const status = adoptionStatus(conf.confirmation, !!conf.fotoUrl);
  const batasPembayaran = conf.createdAt
    ? new Date(new Date(conf.createdAt).getTime() + 24 * 60 * 60 * 1000)
    : null;
  const batasStr = batasPembayaran
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(batasPembayaran)
    : "";
  const subtotal = trees.reduce((sum, t) => sum + t.price, 0);
  const unique = Math.max(0, conf.price - subtotal);
  const sertifikatRows = trees.filter((t) => t.certnum);
  // Adopsi hadiah = ada baris sertifikat atas nama orang lain (bukan kosong).
  const giftRow = sertifikatRows.find((t) => t.nama.trim()) ?? null;
  const giftLink = giftRow ? await absoluteUrl(certUrl(giftRow.certnum!)) : "";
  const localnames = [...new Set(trees.map((t) => t.localName).filter(Boolean))];
  const pohonLabel = `${trees.length} ${trees.length === 1 ? d.treeWord : d.treesWord}${
    localnames.length ? ": " + localnames.join(", ") : ""
  }`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link href="/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        {d.backToDashboard}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-950">
          {d.order} {conf.invoice}
        </h1>
        <StatusBadge
          label={statusLabel[status] ?? status}
          className={ADOPTION_STATUS[status]?.className ?? "bg-zinc-100 text-zinc-600"}
        />
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {d.created} {tanggal(new Date(conf.tanggal))}
      </p>

      {/* Ringkasan pohon dalam order ini */}
      <div className="mt-6 space-y-3">
        {trees.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-emerald-50">
              {t.photoUrl ? (
                <Image src={t.photoUrl} alt={t.localName} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">🌳</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-emerald-950">
                {t.localName} <span className="font-normal text-zinc-400">({t.idpohon})</span>
              </p>
              <p className="mt-1 text-sm text-zinc-600">📍 {namaDesa(t.desa)}</p>
              <p className="text-xs text-zinc-400">
                {d.duration} {t.dur} {t.dur === 1 ? d.year : d.years}
              </p>
              {t.nama ? (
                <p className="text-xs text-emerald-700">
                  {d.certFor} <span className="font-semibold">{t.nama}</span>
                </p>
              ) : null}
              {t.memo ? <p className="text-xs italic text-zinc-400">“{t.memo}”</p> : null}
              {t.tglExp && status === "ACTIVE" && (
                <p className="text-xs text-zinc-400">
                  {d.validUntil} {tanggal(new Date(t.tglExp))}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">{d.adoptionFee}</p>
              <p className="text-lg font-bold text-emerald-700">{rupiah(t.price)}</p>
            </div>
          </div>
        ))}
      </div>

      {status === "PENDING_PAYMENT" && (
        <>
        {batasPembayaran && (
          <div
            data-testid="batas-pembayaran"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5"
          >
            <span className="text-2xl leading-none" aria-hidden>
              ⏰
            </span>
            <div>
              <p className="font-bold text-amber-900">{d.pay.deadlineTitle}</p>
              <p className="mt-1 text-sm font-semibold text-amber-900">
                {d.pay.deadlineAt.replace("{time}", batasStr)}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800/80">{d.pay.deadlineNote}</p>
            </div>
          </div>
        )}
        <OnlinePayment confirmationId={conf.id} linkInvoice={conf.linkInvoice} />
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
            <h2 className="font-bold text-amber-900">{d.pay.instructionsTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">{d.pay.instructionsDesc}</p>
            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{d.pay.totalTransfer}</p>
              <p className="text-2xl font-bold text-emerald-700">{rupiah(conf.price)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {rupiah(subtotal)} + {d.pay.uniqueCode}{" "}
                <span className="font-bold text-amber-600">{unique}</span>
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {banks.map((bank) => (
                <div key={bank.id} className="rounded-xl bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">{bank.bankName}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-emerald-950">
                    {bank.accountNumber}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {d.pay.careOf} {bank.accountName}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-emerald-950">{d.pay.confirmTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600">{d.pay.confirmDesc}</p>
            <div className="mt-4">
              <PaymentForm confirmationId={conf.id} />
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <CancelAdoptionButton confirmationId={conf.id} />
            </div>
          </div>
        </section>
        </>
      )}

      {status === "PENDING_VERIFICATION" && (
        <section className="mt-8 space-y-6">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6">
            <h2 className="font-bold text-blue-900">{d.verify.title}</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900/80">{d.verify.desc}</p>
            {conf.fotoUrl && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-blue-900/60">{d.verify.proofSent}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={conf.fotoUrl}
                  alt={d.verify.proofAlt}
                  className="mt-2 max-h-64 rounded-xl border border-blue-100 bg-white object-contain"
                />
              </div>
            )}
          </div>
          <CancelAdoptionButton confirmationId={conf.id} />
        </section>
      )}

      {status === "ACTIVE" && (
        <>
        <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <p className="text-3xl">🎉</p>
          <h2 className="mt-2 font-bold text-emerald-900">{d.active.title}</h2>
          <p className="mt-1 text-sm text-emerald-900/80">
            {d.active.descPre}{" "}
            <strong>{trees[0]?.nama?.trim() || session.name}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {sertifikatRows.map((t) => (
              <Link
                key={t.id}
                href={certUrl(t.certnum!)}
                className="inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {d.certificate} {t.idpohon}
              </Link>
            ))}
          </div>
          {giftRow && (
            <div className="mt-3 flex justify-center">
              <GiftSend
                certnum={giftRow.certnum!}
                namaPenerima={giftRow.nama.trim()}
                namaPengirim={session.name}
                pohonLabel={pohonLabel}
                link={giftLink}
              />
            </div>
          )}
        </section>
        <TaggingProgress trees={tagging} />
        </>
      )}

      {status === "CANCELLED" && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="font-bold text-zinc-700">{d.cancelled.title}</h2>
          <p className="mt-2 text-sm text-zinc-500">{d.cancelled.desc}</p>
        </section>
      )}
    </main>
  );
}
