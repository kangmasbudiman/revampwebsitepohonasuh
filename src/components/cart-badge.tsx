"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/use-cart";

export default function CartBadge({ overlay = false }: { overlay?: boolean }) {
  const count = useCart().length;

  return (
    <Link
      href="/keranjang"
      aria-label={count > 0 ? `Keranjang: ${count} pohon` : "Keranjang"}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
        overlay ? "text-white hover:bg-white/10" : "text-emerald-900 hover:bg-emerald-50"
      }`}
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
