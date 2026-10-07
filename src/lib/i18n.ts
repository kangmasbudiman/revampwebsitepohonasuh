import { cache } from "react";
import { cookies } from "next/headers";
import { dict as idDict } from "@/dictionaries/id";
import { dict as enDict } from "@/dictionaries/en";

// i18n ringan berbasis cookie (pa_lang), tanpa library. id = default.
// id.ts adalah sumber kebenaran bentuk kamus; en.ts dipaksa mengikuti
// lewat tipe Dict sehingga key Hilang/typo jadi error kompilasi.

export const LOCALE_COOKIE = "pa_lang";
export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export type Dict = typeof idDict;

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "id";
});

export const getDict = cache(async (): Promise<Dict> => {
  return (await getLocale()) === "en" ? enDict : idDict;
});
