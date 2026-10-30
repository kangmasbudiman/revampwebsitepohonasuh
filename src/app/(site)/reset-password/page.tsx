"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { resetPassword, type AuthState } from "@/lib/actions/auth";
import { useI18n } from "@/components/i18n-provider";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

// Lanjutan alur lupa password: setelah kode OTP 6 digit dikirim via email,
// pengguna memasukkan kode + kata sandi baru di sini. Email boleh datang
// terisi otomatis dari ?emaile= (tombol di halaman lupa password).
export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const searchParams = use(props.searchParams);
  const emaile = typeof searchParams.emaile === "string" ? searchParams.emaile : "";
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});
  const t = useI18n().dict.pages.resetPassword;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-950">{t.title}</h1>

        {state.success ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
              <span aria-hidden>✅</span> {t.successTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80">{t.successDesc}</p>
            <Link
              href="/masuk"
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t.toLogin}
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{t.desc}</p>
            <form action={action} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  {t.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={emaile}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="kode" className="block text-sm font-medium text-zinc-700">
                  {t.kode}
                </label>
                <input
                  id="kode"
                  name="kode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  className={`${inputClass} text-center font-mono text-lg tracking-[0.5em]`}
                />
                <p className="mt-1 text-xs text-zinc-400">{t.kodeHint}</p>
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
              <div>
                <label htmlFor="konfirmasi" className="block text-sm font-medium text-zinc-700">
                  {t.konfirmasi}
                </label>
                <input
                  id="konfirmasi"
                  name="konfirmasi"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
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
                {pending ? t.processing : t.submit}
              </button>
            </form>
            <p className="mt-4">
              <Link
                href="/lupa-password"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                ← {useI18n().dict.pages.lupaPassword.title}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
