"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { register, type AuthState } from "@/lib/actions/auth";
import { useI18n } from "@/components/i18n-provider";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function RegisterPage(props: PageProps<"/daftar">) {
  const searchParams = use(props.searchParams);
  const next = typeof searchParams.next === "string" ? searchParams.next : "";
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  const t = useI18n().dict.pages.daftar;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-950">{t.heading}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t.hasAccount}{" "}
          <Link
            href={next ? `/masuk?next=${encodeURIComponent(next)}` : "/masuk"}
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {t.loginHere}
          </Link>
        </p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              {t.fullName}
            </label>
            <input id="name" name="name" type="text" required autoComplete="name" className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              {t.email}
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
                {t.phone} <span className="text-zinc-400">{t.optional}</span>
              </label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-zinc-700">
                {t.country} <span className="text-zinc-400">{t.optional}</span>
              </label>
              <input id="country" name="country" type="text" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              {t.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-400">{t.passwordHint}</p>
          </div>
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? t.processing : t.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
