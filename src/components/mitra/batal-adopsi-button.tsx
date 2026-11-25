"use client";

import { useState, useActionState } from "react";
import { cancelAdoption, type AdoptionState } from "@/lib/actions/adoption";
import { rupiah } from "@/lib/format";
import { XCircle, X } from "lucide-react";

type Invoice = { id: number; invoice: string; price: number };

function BatalForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [state, action, pending] = useActionState<AdoptionState, FormData>(cancelAdoption, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="confirmationId" value={invoice.id} />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-semibold text-zinc-800">{invoice.invoice}</p>
        <p className="text-[11px] text-zinc-500">Tagihan {rupiah(invoice.price)}</p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Membatalkan…" : "Batalkan"}
      </button>
      {state.error && <p className="w-full text-[11px] text-red-600">{state.error}</p>}
      <button type="button" onClick={onDone} className="hidden" aria-hidden />
    </form>
  );
}

// Tombol "Batal Adopsi" di Program Saya — membatalkan invoice yang belum dibayar
// untuk program terkait (sama seperti tombol di halaman pembayaran invoice).
export default function BatalAdopsiButton({
  invoices,
  programNama,
}: {
  invoices: Invoice[];
  programNama: string;
}) {
  const [open, setOpen] = useState(false);
  if (invoices.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400"
        title={`Batalkan adopsi yang belum dibayar untuk ${programNama}`}
      >
        Batal Adopsi
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Batal adopsi ${programNama}`}>
          <button type="button" className="absolute inset-0 cursor-default bg-black/55" onClick={() => setOpen(false)} aria-label="Tutup" />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-night-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-extrabold text-emerald-950 dark:text-emerald-100">
                  <XCircle className="h-5 w-5 text-red-600" aria-hidden /> Batal Adopsi
                </h3>
                <p className="mt-1 text-xs text-zinc-500">{programNama} · {invoices.length} tagihan belum dibayar</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-night-800" aria-label="Tutup">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 dark:border-night-700">
              {invoices.map((inv) => (
                <div key={inv.id} className="rounded-xl border border-zinc-200 p-3 dark:border-night-700">
                  <BatalForm invoice={inv} onDone={() => setOpen(false)} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-zinc-400">Pembatalan langsung berlaku untuk tagihan yang belum dibayar.</p>
          </div>
        </div>
      )}
    </>
  );
}
