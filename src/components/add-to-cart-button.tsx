"use client";

import { useState } from "react";
import { Check, ShoppingCart, ShoppingCartMinus } from "lucide-react";
import { addToCart, removeFromCart, type CartItem } from "@/lib/cart";
import { useCart } from "@/lib/use-cart";
import { useI18n } from "@/components/i18n-provider";

export default function AddToCartButton({
  item,
  variant = "full",
}: {
  item: CartItem;
  variant?: "full" | "icon";
}) {
  const { dict } = useI18n();
  const t = dict.cart;
  const [added, setAdded] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const inCart = useCart().some((i) => i.code === item.code);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) {
      removeFromCart(item.code);
      return;
    }
    const result = addToCart(item);
    if (result === "duplicate") {
      setDuplicate(true);
      window.setTimeout(() => setDuplicate(false), 2000);
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={
          inCart
            ? t.removeAria.replaceAll("{name}", item.localName)
            : t.addAria.replaceAll("{name}", item.localName)
        }
        title={inCart ? t.removeTitle : duplicate ? t.inCartTitle : t.addToCartTitle}
        onClick={handleClick}
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-all duration-300 ${
          duplicate
            ? "bg-amber-100 text-amber-700"
            : added
              ? "bg-emerald-600 text-white"
              : inCart
                ? "bg-orange-500 text-white"
                : "bg-white/95 text-emerald-700 hover:bg-emerald-600 hover:text-white"
        }`}
      >
        {added || duplicate ? (
          <Check className="h-4 w-4" />
        ) : inCart ? (
          <ShoppingCartMinus className="h-4 w-4" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-colors ${
          inCart
            ? "border-orange-400 bg-orange-50 text-orange-600 hover:border-orange-500 hover:bg-orange-100"
            : "border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50"
        }`}
      >
        {inCart ? <ShoppingCartMinus className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        {inCart ? t.removeTitle : t.addToCart}
      </button>
      {(added || duplicate) && (
        <p
          className={`mt-2 text-center text-xs font-medium ${
            duplicate ? "text-amber-600" : "text-emerald-600"
          }`}
        >
          {duplicate ? t.duplicateMsg : t.addedMsg}
        </p>
      )}
    </div>
  );
}
