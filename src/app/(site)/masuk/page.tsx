"use client";

import Link from "next/link";
import { use, useActionState, useEffect, useState } from "react";
import { login, verify2fa, type AuthState } from "@/lib/actions/auth";
import { useI18n } from "@/components/i18n-provider";
import KirimUlangVerifikasi from "@/components/kirim-ulang-verifikasi";
import { RefreshCw, ShieldCheck } from "lucide-react";

export default function LoginPage(props: PageProps<"/masuk">) {
  const searchParams = use(props.searchParams);
  const next = typeof searchParams.next === "string" ? searchParams.next : "";
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  const [otpState, otpAction, otpPending] = useActionState<AuthState, FormData>(verify2fa, {});
  const [captcha, setCaptcha] = useState("");
  const t = useI18n().dict.pages.masuk;

  async function muatCaptcha() {
    try {
      const res = await fetch("/api/captcha", { cache: "no-store" });
      const json = (await res.json()) as { code?: string };
      if (json.code) setCaptcha(json.code);
    } catch {
      setCaptcha("");
    }
  }

  useEffect(() => {
    void muatCaptcha();
  }, []);

  useEffect(() => {
    if (state.captcha) setCaptcha(state.captcha);
  }, [state.captcha]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-950">{t.heading}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t.noAccount}{" "}
          <Link
            href={next ? `/daftar?next=${encodeURIComponent(next)}` : "/daftar"}
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {t.registerNow}
          </Link>
          {" · "}
          <Link href="/daftar-mitra" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Daftar Mitra
          </Link>
        </p>

        {typeof searchParams.terdaftar === "string" && searchParams.terdaftar === "1" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✅ Pendaftaran mitra berhasil. Akun Anda menunggu aktivasi dari admin
            KKI Warsi — silakan masuk setelah diaktifkan.
          </div>
        )}

        {state.twoFactor ? (
          <form action={otpAction} className="mt-6 space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" /> Verifikasi 2 Langkah
            </div>
            <p className="text-sm text-zinc-600">
              Kode OTP telah dikirim ke <strong>{state.emaile ?? otpState.emaile ?? "email Anda"}</strong>.
              Masukkan 6 angka di bawah ini.
            </p>
            <div>
              <label htmlFor="kode" className="block text-sm font-medium text-zinc-700">
                Kode OTP
              </label>
              <input
                id="kode"
                name="kode"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="000000"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-center text-lg tracking-[0.4em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            {(otpState.error || otpState.otpSent) && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  otpState.error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {otpState.error ?? "Kode baru telah dikirim. Silakan cek email Anda."}
              </p>
            )}
            <button
              type="submit"
              disabled={otpPending}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {otpPending ? "Memverifikasi…" : "Verifikasi & Masuk"}
            </button>
            <button
              type="submit"
              name="mode"
              value="resend"
              disabled={otpPending}
              className="w-full text-center text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
            >
              Kirim ulang kode OTP
            </button>
          </form>
        ) : (
          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
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
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
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
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Captcha lokal */}
            <div>
              <label htmlFor="captcha" className="block text-sm font-medium text-zinc-700">
                Captcha
              </label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex h-11 min-w-0 flex-1 select-none items-center justify-center rounded-xl border border-zinc-200 bg-emerald-50 font-mono text-lg font-bold tracking-[0.35em] text-emerald-800">
                  {captcha || "…"}
                </div>
                <button
                  type="button"
                  onClick={() => void muatCaptcha()}
                  aria-label="Muat ulang captcha"
                  title="Muat ulang captcha"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-emerald-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <input
                id="captcha"
                name="captcha"
                required
                autoComplete="off"
                placeholder="Masukkan teks di atas"
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {state.unverified ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm leading-6 text-amber-800">{t.unverifiedNotice}</p>
                {state.emaile && (
                  <div className="mt-3">
                    <KirimUlangVerifikasi
                      emailAwal={state.emaile}
                      labels={{
                        resend: t.resendVerification,
                        resending: t.resending,
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              state.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
              )
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? t.processing : t.submit}
            </button>
            <p className="text-right">
              <Link
                href="/lupa-password"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                {t.forgotPassword}
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
