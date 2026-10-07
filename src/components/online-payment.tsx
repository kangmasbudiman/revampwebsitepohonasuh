"use client";

// Kartu "Bayar Online" (Mayar) di halaman order belum dibayar: buat tagihan
// online → buka halaman pembayaran Mayar (QRIS/VA/e-wallet) → webhook
// memverifikasi otomatis, tanpa unggah bukti transfer.

import { useActionState } from "react";
import { ExternalLink, Loader2, RefreshCw, Zap } from "lucide-react";
import { createPaymentLink, type PaymentLinkState } from "@/lib/actions/adoption";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

function TombolBuka({ link, label }: { link: string; label: string }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
    >
      {label} <ExternalLink className="h-4 w-4" />
    </a>
  );
}

export default function OnlinePayment({
  confirmationId,
  linkInvoice,
}: {
  confirmationId: number;
  linkInvoice: string | null;
}) {
  const { dict } = useI18n();
  const t = dict.dashboard.online;
  const router = useRouter();
  const [state, action, pending] = useActionState<PaymentLinkState, FormData>(
    createPaymentLink,
    {},
  );
  const link = state.link ?? linkInvoice;

  return (
    <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-bold text-emerald-950">
            <Zap className="h-5 w-5 text-emerald-600" /> {t.title}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-emerald-900/70">
            {t.descA} <strong>{t.descStrong}</strong> {t.descB}
          </p>
        </div>

        {link ? (
          <div className="flex flex-col items-end gap-2">
            <TombolBuka link={link} label={t.continuePayment} />
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t.checkStatus}
            </button>
          </div>
        ) : (
          <form action={action} className="shrink-0">
            <input type="hidden" name="confirmationId" value={confirmationId} />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {pending ? t.preparing : t.payNow}
            </button>
          </form>
        )}
      </div>

      {link && (
        <p className="mt-3 truncate text-xs text-zinc-500">
          {t.invoiceRef} <span className="font-mono">{link}</span>
        </p>
      )}
      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
    </section>
  );
}
