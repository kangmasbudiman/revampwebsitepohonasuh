"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { cancelAdoption, type AdoptionState } from "@/lib/actions/adoption";

export default function CancelAdoptionButton({ confirmationId }: { confirmationId: number }) {
  const { dict } = useI18n();
  const t = dict.dashboard.pay;
  const [state, action, pending] = useActionState<AdoptionState, FormData>(cancelAdoption, {});

  return (
    <form action={action}>
      <input type="hidden" name="confirmationId" value={confirmationId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? t.processing : t.cancelAdoption}
      </button>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
