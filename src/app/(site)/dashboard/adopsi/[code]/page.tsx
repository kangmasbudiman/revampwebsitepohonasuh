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
  type ApiAdopsiPohon,
  type ApiBank,
  type ApiConfirmation,
} from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { rupiah, tanggal, ADOPTION_STATUS } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import PaymentForm from "@/components/payment-form";
import OnlinePayment from "@/components/online-payment";
import CancelAdoptionButton from "@/components/cancel-adoption-button";

export default async function AdoptionDetailPage(props: PageProps<"/dashboard/adopsi/[code]">) {
  const { code } = await props.params;
  const session = await requireUser();

  let conf: ApiConfirmation | null = null;
  let trees: ApiAdopsiPohon[] = [];
  let banks: ApiBank[] = [];
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
    }
  } catch {
    // notFound di bawah yang menangani
  }
  if (!conf) notFound();

  const status = adoptionStatus(conf.confirmation, !!conf.fotoUrl);
  const statusInfo = ADOPTION_STATUS[status] ?? { label: status, className: "bg-zinc-100 text-zinc-600" };
  const subtotal = trees.reduce((sum, t) => sum + t.price, 0);
  const unique = Math.max(0, conf.price - subtotal);
  const sertifikatRows = trees.filter((t) => t.certnum);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <Link href="/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        ← Kembali ke Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-950">Order {conf.invoice}</h1>
        <StatusBadge {...statusInfo} />
      </div>
      <p className="mt-1 text-sm text-zinc-500">Dibuat {tanggal(new Date(conf.tanggal))}</p>

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
              <p className="mt-1 text-sm text-zinc-600">📍 {t.desa}</p>
              <p className="text-xs text-zinc-400">
                Durasi {t.dur} {t.dur === 1 ? "tahun" : "tahun"}
              </p>
              {t.nama ? (
                <p className="text-xs text-emerald-700">
                  Sertifikat a.n. <span className="font-semibold">{t.nama}</span>
                </p>
              ) : null}
              {t.memo ? <p className="text-xs italic text-zinc-400">“{t.memo}”</p> : null}
              {t.tglExp && status === "ACTIVE" && (
                <p className="text-xs text-zinc-400">Berlaku hingga {tanggal(new Date(t.tglExp))}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Biaya adopsi</p>
              <p className="text-lg font-bold text-emerald-700">{rupiah(t.price)}</p>
            </div>
          </div>
        ))}
      </div>

      {status === "PENDING_PAYMENT" && (
        <>
        <OnlinePayment confirmationId={conf.id} linkInvoice={conf.linkInvoice} />
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
            <h2 className="font-bold text-amber-900">Instruksi Pembayaran</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              Transfer tepat <strong>sesuai jumlah total</strong> di bawah ini agar pembayaran Anda
              mudah diverifikasi. Kode unik membedakan transfer Anda dari donatur lain.
            </p>
            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Total Transfer</p>
              <p className="text-2xl font-bold text-emerald-700">{rupiah(conf.price)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {rupiah(subtotal)} + kode unik{" "}
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
                  <p className="text-sm text-zinc-600">a.n. {bank.accountName}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-emerald-950">Konfirmasi Pembayaran</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Sudah transfer? Kirim bukti pembayaran di bawah ini. Sertifikat adopsi akan terbit
              setelah admin memverifikasi pembayaran Anda.
            </p>
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
            <h2 className="font-bold text-blue-900">Pembayaran Sedang Diverifikasi</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900/80">
              Terima kasih! Bukti pembayaran Anda sudah kami terima. Tim kami akan memverifikasi
              dalam 1-2 hari kerja.
            </p>
            {conf.fotoUrl && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-blue-900/60">Bukti yang dikirim:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={conf.fotoUrl}
                  alt="Bukti pembayaran"
                  className="mt-2 max-h-64 rounded-xl border border-blue-100 bg-white object-contain"
                />
              </div>
            )}
          </div>
          <CancelAdoptionButton confirmationId={conf.id} />
        </section>
      )}

      {status === "ACTIVE" && (
        <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <p className="text-3xl">🎉</p>
          <h2 className="mt-2 font-bold text-emerald-900">Adopsi Aktif</h2>
          <p className="mt-1 text-sm text-emerald-900/80">
            Pembayaran Anda terverifikasi. Pohon diasuh atas nama{" "}
            <strong>{trees[0]?.nama?.trim() || session.name}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {sertifikatRows.map((t) => (
              <Link
                key={t.id}
                href={certUrl(t.certnum!)}
                className="inline-block rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Sertifikat {t.idpohon}
              </Link>
            ))}
          </div>
        </section>
      )}

      {status === "CANCELLED" && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="font-bold text-zinc-700">Adopsi Dibatalkan</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Order ini telah dibatalkan. Anda dapat mengadopsi pohon lain kapan saja.
          </p>
        </section>
      )}
    </main>
  );
}
