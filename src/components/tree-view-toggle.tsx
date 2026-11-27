"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List as ListIcon } from "lucide-react";

type Props = {
  view: "grid" | "list";
  sort: string;
  params: Record<string, string | undefined>;
  labels: {
    view: string;
    grid: string;
    list: string;
    sort: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortDiameter: string;
  };
};

const STORAGE_KEY = "pa_pohon_view";

export default function TreeViewToggle({ view, sort, params, labels }: Props) {
  const router = useRouter();

  // Prioritas: URL > localStorage > default (grid). Kalau URL tidak punya
  // ?view, preferensi tersimpan dipindahkan ke URL supaya bisa dibagikan.
  useEffect(() => {
    if (params.view) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "grid" || saved === "list") {
        if (saved !== view) router.replace(buildHref(params, { view: saved }));
      }
    } catch {
      // localStorage diblokir — tetap pakai default dari server.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.view]);

  function pilihView(next: "grid" | "list") {
    if (next === view) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // abaikan bila storage tidak tersedia
    }
    router.push(buildHref(params, { view: next }));
  }

  function pilihSort(next: string) {
    router.push(buildHref(params, { sort: next === "newest" ? undefined : next }));
  }

  const opsi = [
    { key: "grid" as const, label: labels.grid, Icon: LayoutGrid },
    { key: "list" as const, label: labels.list, Icon: ListIcon },
  ];

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <label className="sr-only" htmlFor="sort-pohon">{labels.sort}</label>
      <select
        id="sort-pohon"
        value={sort || "newest"}
        onChange={(e) => pilihSort(e.target.value)}
        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        <option value="newest">{labels.sortNewest}</option>
        <option value="price-asc">{labels.sortPriceAsc}</option>
        <option value="price-desc">{labels.sortPriceDesc}</option>
        <option value="diameter-desc">{labels.sortDiameter}</option>
      </select>

      <div
        role="radiogroup"
        aria-label={labels.view}
        className="inline-flex items-center rounded-xl border border-emerald-200 bg-white p-1"
      >
        {opsi.map(({ key, label, Icon }) => {
          const aktif = view === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={aktif}
              aria-label={label}
              onClick={() => pilihView(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                aktif
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildHref(
  params: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && !(k in patch)) sp.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v) sp.set(k, v);
    else sp.delete(k);
  }
  const s = sp.toString();
  return s ? `/pohon?${s}` : "/pohon";
}
