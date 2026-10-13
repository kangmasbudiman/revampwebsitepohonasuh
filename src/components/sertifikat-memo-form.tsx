"use client";

import { useEffect, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareQuote } from "lucide-react";
import { simpanMemoSertifikat, type MemoState } from "@/lib/actions/sertifikat";
import { useI18n } from "@/components/i18n-provider";

// Form pesan "Message and Impression" — hanya dirender untuk pemilik
// sertifikat yang sedang login (guard di halaman).
export default function SertifikatMemoForm({
  certnum,
  memo,
}: {
  certnum: string;
  memo: string;
}) {
  const { dict } = useI18n();
  const t = dict.sertifikat;
  const router = useRouter();
  const [state, action, pending] = useActionState<MemoState, FormData>(
    simpanMemoSertifikat,
    {},
  );
  const [teks, setTeks] = useState(memo);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="no-print mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <MessageSquareQuote className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-emerald-950">{t.memoTitle}</h2>
          <p className="text-xs text-zinc-500">{t.memoDesc}</p>
        </div>
      </div>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="certnum" value={certnum} />
        <textarea
          name="memo"
          maxLength={255}
          rows={3}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder={t.memoPh}
          className="w-full resize-none rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">{teks.length}/255</p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? t.memoSaving : t.memoSave}
          </button>
        </div>
        {state.ok && <p className="text-xs font-medium text-emerald-600">{t.memoSaved}</p>}
        {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
