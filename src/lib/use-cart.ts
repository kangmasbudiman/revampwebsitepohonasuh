"use client";

import { useSyncExternalStore } from "react";
import { getCart, serverSnapshot, subscribe } from "@/lib/cart";

export function useCart() {
  return useSyncExternalStore(subscribe, getCart, serverSnapshot);
}
