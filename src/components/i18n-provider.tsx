"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict, Locale } from "@/lib/i18n";

// Kamus + locale dilempar dari server layout (async components) ke seluruh
// client components turunannya lewat context.
const I18nContext = createContext<{ locale: Locale; dict: Dict } | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): { locale: Locale; dict: Dict } {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n harus dipakai di dalam I18nProvider");
  return ctx;
}
