"use server";

import { requireAdmin } from "@/lib/guard";
import { apiPost, mapGlobalSearch, EMPTY_GLOBAL_SEARCH, type ApiGlobalSearch } from "@/lib/api";

// Pencarian global top bar admin. Gagal koneksi → hasil kosong, bukan
// error — dialog cukup menampilkan "tidak ada hasil".
export async function searchGlobal(q: string): Promise<ApiGlobalSearch> {
  await requireAdmin();
  try {
    return mapGlobalSearch(await apiPost<Record<string, unknown>>("globalsearch", { q }));
  } catch {
    return EMPTY_GLOBAL_SEARCH;
  }
}
