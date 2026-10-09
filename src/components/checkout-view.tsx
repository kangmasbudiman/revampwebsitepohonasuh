"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { checkoutCart, type CheckoutState } from "@/lib/actions/adoption";
import { clearCart, removeFromCart, updateCartItem, MAX_YEARS } from "@/lib/cart";
import { useCart } from "@/lib/use-cart";
import { namaDesa, rupiah } from "@/lib/format";
import { useI18n } from "@/components/i18n-provider";

export default function CheckoutView() {
  const { dict } = useI18n();
  const t = dict.cart;
  const items = useCart();
  const router = useRouter();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    checkoutCart,
    {},
  );
  const skipped = state.unavailable ?? [];
  const [giftOpen, setGiftOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      clearCart();
      // Ada pohon yang digugurkan → jangan langsung pindah, beri pengguna
      // kesempatan membaca banner sebelum lanjut ke invoice.
      if (!skipped.length) router.push(state.redirectTo);
    }
    for (const u of skipped) removeFromCart(u.code);
  }, [state, router, skipped]);

  // Setelah checkout sukses keranjang dikosongkan — jangan tampilkan empty
  // state yang menelan banner hasil (pohon yang digugurkan, dsb.).
  if (items.length === 0 && !pending && !state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-emerald-950">{t.checkoutEmptyTitle}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t.checkoutEmptyDesc}</p>
        <Link
          href="/pohon"
          className="mt-6 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t.pickTree}
        </Link>
      </div>
    );
  }

  const total = items.reduce(
    (s, i) => s + i.priceIdr * (i.years ?? 1),
    0,
  );
  const totalYears = items.reduce((s, i) => s + (i.years ?? 1), 0);

  return (
    <div className="mx-auto max-w-2xl">
      {state.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && state.redirectTo && skipped.length > 0 && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">{t.okBanner}</p>
          <p className="mt-1">
            {t.skippedOrder}{" "}
            <span className="font-medium">
              {skipped.map((u) => `${u.localName} (${u.code})`).join(", ")}
            </span>
          </p>
          <Link
            href={state.redirectTo}
            className="mt-2 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            {t.viewInvoice}
          </Link>
        </div>
      )}
      {!state.ok && skipped.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.skippedCart}{" "}
          <span className="font-medium">
            {skipped.map((u) => `${u.localName} (${u.code})`).join(", ")}
          </span>
          {items.length > 0 && t.othersOk}
        </div>
      )}

      <form action={action} className="space-y-4">
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((i) => ({
              code: i.code,
              years: i.years ?? 1,
              giftName: i.giftName ?? "",
              giftNote: i.giftNote ?? "",
            })),
          )}
        />
        {items.map((item) => {
          const years = item.years ?? 1;
          const open = giftOpen[item.code] ?? !!(item.giftName || item.giftNote);
          return (
            <div
              key={item.code}
              className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.localName}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-2xl">🌳</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-emerald-950">{item.localName}</p>
                  <p className="text-xs text-zinc-500">
                    {namaDesa(item.desa)} · {item.code} · {rupiah(item.priceIdr)}/tahun
                  </p>
                </div>
                <span className="whitespace-nowrap font-bold text-emerald-700">
                  {rupiah(item.priceIdr * years)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-emerald-50 pt-3">
                <span className="text-xs font-medium text-zinc-500">{t.duration}</span>
                {Array.from({ length: MAX_YEARS }, (_, k) => k + 1).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => updateCartItem(item.code, { years: y })}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      years === y
                        ? "bg-emerald-600 text-white"
                        : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {y} {t.yrsShort}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setGiftOpen((m) => ({ ...m, [item.code]: !open }))
                  }
                  className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    open
                      ? "bg-emerald-100 text-emerald-800"
                      : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  <Gift className="h-3.5 w-3.5" />
                  {t.gift}
                </button>
              </div>

              {open && (
                <div className="mt-3 grid gap-3 rounded-xl bg-emerald-50/50 p-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-500">
                      {t.giftNameLabel}
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={item.giftName ?? ""}
                      onChange={(e) =>
                        updateCartItem(item.code, { giftName: e.target.value })
                      }
                      placeholder={t.giftNamePh}
                      className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500">
                      {t.giftNoteLabel}
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={item.giftNote ?? ""}
                      onChange={(e) =>
                        updateCartItem(item.code, { giftNote: e.target.value })
                      }
                      placeholder={t.giftNotePh}
                      className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 sm:col-span-2">{t.giftHint}</p>
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>
              {t.total} ({items.length} {items.length === 1 ? t.treeWord : t.treesWord} ·{" "}
              {totalYears} {totalYears === 1 ? t.year : t.years} {t.adoptionWord})
            </span>
            <span className="text-lg font-bold text-emerald-700">{rupiah(total)}</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{t.verifyNote}</p>
          <button
            type="submit"
            disabled={pending || items.length === 0}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-60"
          >
            {pending ? t.processing : t.createOrder}
          </button>
        </div>
      </form>
    </div>
  );
}
