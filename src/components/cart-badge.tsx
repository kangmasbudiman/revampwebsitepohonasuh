"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/use-cart";
import { useI18n } from "@/components/i18n-provider";

export default function CartBadge({
  overlay = false,
  onNavigate,
}: {
  overlay?: boolean;
  onNavigate?: () => void;
}) {
  const { dict } = useI18n();
  const count = useCart().length;

  return (
    <Link
      href="/keranjang"
      onClick={onNavigate}
      aria-label={
        count > 0 ? dict.cart.cartWithAria.replaceAll("{n}", String(count)) : dict.cart.cartAria
      }
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
        overlay ? "text-white hover:bg-white/10" : "text-emerald-900 hover:bg-emerald-50"
      }`}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
