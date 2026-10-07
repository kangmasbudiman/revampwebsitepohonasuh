"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Gift, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/use-cart";
import { removeFromCart, updateCartItem, MAX_YEARS } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import { useI18n } from "@/components/i18n-provider";

export default function CartView({ loggedIn }: { loggedIn: boolean }) {
  const { dict } = useI18n();
  const t = dict.cart;
  const items = useCart();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
        <p className="text-5xl">🛒</p>
        <h2 className="mt-4 text-lg font-semibold text-emerald-950">{t.emptyTitle}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t.emptyDesc}</p>
        <Link
          href="/pohon"
          className="mt-6 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t.browseTrees}
        </Link>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + i.priceIdr * (i.years ?? 1), 0);
  const totalYears = items.reduce((s, i) => s + (i.years ?? 1), 0);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {items.map((item, idx) => {
          const years = item.years ?? 1;
          return (
          <div
            key={item.code}
            className="flex items-center gap-4 rounded-2xl border border-orange-200 border-l-4 border-l-orange-400 bg-white p-4 shadow-sm"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
              <span className="absolute -left-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white shadow ring-2 ring-white">
                {idx + 1}
              </span>
              {item.photoUrl ? (
                <Image
                  src={item.photoUrl}
                  alt={item.localName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl">🌳</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/pohon/${item.code}`}
                className="truncate font-semibold text-emerald-950 hover:text-emerald-700"
              >
                {item.localName}
              </Link>
              <p className="text-xs text-zinc-500">
                {item.desa} · {item.code}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white">
                  <button
                    type="button"
                    aria-label={t.minusAria.replaceAll("{name}", item.localName)}
                    disabled={years <= 1}
                    onClick={() => updateCartItem(item.code, { years: years - 1 })}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[4.25rem] text-center text-xs font-semibold text-emerald-800">
                    {years} {years === 1 ? t.year : t.years}
                  </span>
                  <button
                    type="button"
                    aria-label={t.plusAria.replaceAll("{name}", item.localName)}
                    disabled={years >= MAX_YEARS}
                    onClick={() => updateCartItem(item.code, { years: years + 1 })}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-xs text-zinc-500">
                  {rupiah(item.priceIdr)} {t.perYear}
                </span>
              </div>
              {item.giftName ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700">
                  <Gift className="h-3 w-3" /> {t.giftFor} {item.giftName}
                </p>
              ) : null}
            </div>
            <span className="whitespace-nowrap font-bold text-emerald-700">
              {rupiah(item.priceIdr * years)}
            </span>
            <button
              type="button"
              aria-label={t.removeAria.replaceAll("{name}", item.localName)}
              onClick={() => removeFromCart(item.code)}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          );
        })}
      </div>

      <aside className="h-fit rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-emerald-950">{t.summary}</h2>
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <span>
            {items.length} {items.length === 1 ? t.treeWord : t.treesWord} · {totalYears}{" "}
            {totalYears === 1 ? t.year : t.years}
          </span>
          <span className="text-base font-bold text-emerald-700">{rupiah(total)}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">{t.uniqueNote}</p>
        <Link
          href={loggedIn ? "/checkout" : "/masuk?next=/checkout"}
          className="mt-6 block w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-400"
        >
          {loggedIn ? t.checkout : t.loginToCheckout}
        </Link>
        {!loggedIn && (
          <p className="mt-3 text-center text-xs text-zinc-500">
            {t.noAccount}{" "}
            <Link href="/daftar" className="font-medium text-emerald-700 hover:underline">
              {dict.nav.register}
            </Link>
          </p>
        )}
      </aside>
    </div>
  );
}
