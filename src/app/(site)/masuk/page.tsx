"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { login, type AuthState } from "@/lib/actions/auth";

export default function LoginPage(props: PageProps<"/masuk">) {
  const searchParams = use(props.searchParams);
  const next = typeof searchParams.next === "string" ? searchParams.next : "";
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-950">Masuk</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Belum punya akun?{" "}
          <Link
            href={next ? `/daftar?next=${encodeURIComponent(next)}` : "/daftar"}
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Daftar sekarang
          </Link>
        </p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email
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
              Kata Sandi
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
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
