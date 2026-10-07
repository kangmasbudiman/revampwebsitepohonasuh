"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/use-cart";
import { useI18n } from "@/components/i18n-provider";

// Penanda kartu pohon yang sudah ada di keranjang: bingkai oranye + chip
// label. Dirender absolut — pembungkus kartu wajib `relative` (Link di
// TreeCard). Berlangganan store keranjang sehingga live-update saat item
// ditambah/dihapus dari tab lain.
export default function CartMarker({ code }: { code: string }) {
  const items = useCart();
  const { dict } = useI18n();
  if (!items.some((i) => i.code === code)) return null;
  return (
    <>
      <span className="pointer-events-none absolute inset-0 z-10 rounded-2xl border-[3px] border-orange-400" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
        <ShoppingCart className="h-3 w-3" />
        {dict.cart.inCartBadge}
      </span>
    </>
  );
}
