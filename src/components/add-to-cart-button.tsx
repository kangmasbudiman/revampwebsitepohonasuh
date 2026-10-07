"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { addToCart, type CartItem } from "@/lib/cart";
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

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
        aria-label={t.addAria.replaceAll("{name}", item.localName)}
        title={duplicate ? t.inCartTitle : t.addToCartTitle}
        onClick={handleClick}
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-all duration-300 ${
          duplicate
            ? "bg-amber-100 text-amber-700"
            : added
              ? "bg-emerald-600 text-white"
              : "bg-white/95 text-emerald-700 hover:bg-emerald-600 hover:text-white"
        }`}
      >
        {added || duplicate ? (
          <Check className="h-4 w-4" />
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
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
      >
        <ShoppingCart className="h-4 w-4" />
        {t.addToCart}
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
