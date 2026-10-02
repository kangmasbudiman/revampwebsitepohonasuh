"use client";

import { useActionState } from "react";
import { submitPayment, type AdoptionState } from "@/lib/actions/adoption";

export default function PaymentForm({ confirmationId }: { confirmationId: number }) {
  const [state, action, pending] = useActionState<AdoptionState, FormData>(submitPayment, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="confirmationId" value={confirmationId} />
      <div>
        <label htmlFor="proof" className="block text-sm font-medium text-zinc-700">
          Bukti Transfer <span className="text-zinc-400">(screenshot/gambar, maks 2 MB)</span>
        </label>
        <input
          id="proof"
          name="proof"
          type="file"
          accept="image/*"
          required
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Mengirim..." : "Kirim Bukti Pembayaran"}
      </button>
    </form>
  );
}
