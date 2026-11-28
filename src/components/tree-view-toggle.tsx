"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Award,
  Check,
  ChevronUp,
  Clock3,
  LayoutGrid,
  Leaf,
  List as ListIcon,
  MoveHorizontal,
  type LucideIcon,
} from "lucide-react";

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
    sortOldest: string;
    sortMostAdopted: string;
    sortLeastAdopted: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortDiameterAsc: string;
    sortDiameterDesc: string;
    sortNameAsc: string;
    sortNameDesc: string;
  };
};

const STORAGE_KEY = "pa_pohon_view";

type OpsiSort = { value: string; label: string; Icon: LucideIcon | null; teks?: string };

export default function TreeViewToggle({ view, sort, params, labels }: Props) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const opsiSort: OpsiSort[] = [
    { value: "newest", label: labels.sortNewest, Icon: Leaf },
    { value: "oldest", label: labels.sortOldest, Icon: Clock3 },
    { value: "most-adopted", label: labels.sortMostAdopted, Icon: Award },
    { value: "least-adopted", label: labels.sortLeastAdopted, Icon: Leaf },
    { value: "price-asc", label: labels.sortPriceAsc, Icon: ArrowDown },
    { value: "price-desc", label: labels.sortPriceDesc, Icon: ArrowUp },
    { value: "diameter-asc", label: labels.sortDiameterAsc, Icon: MoveHorizontal },
    { value: "diameter-desc", label: labels.sortDiameterDesc, Icon: ArrowUpRight },
    { value: "name-asc", label: labels.sortNameAsc, Icon: null, teks: "A-Z" },
    { value: "name-desc", label: labels.sortNameDesc, Icon: null, teks: "Z-A" },
  ];
  const dipilih = opsiSort.find((o) => o.value === sort) ?? opsiSort[0];
  const PilihIcon = dipilih.Icon;

  // Prioritas: URL > localStorage > default (grid).
  useEffect(() => {
    if (params.view) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if ((saved === "grid" || saved === "list") && saved !== view) {
        router.replace(buildHref(params, { view: saved }));
      }
    } catch {
      // localStorage tidak tersedia — pakai default server.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.view]);

  useEffect(() => {
    function tutup(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setBuka(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false);
    }
    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function pilihView(next: "grid" | "list") {
    if (next === view) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // abaikan
    }
    router.push(buildHref(params, { view: next }));
  }

  function pilihSort(next: string) {
    setBuka(false);
    router.push(buildHref(params, { sort: next === "newest" ? undefined : next }));
  }

  const opsiView = [
    { key: "grid" as const, label: labels.grid, Icon: LayoutGrid },
    { key: "list" as const, label: labels.list, Icon: ListIcon },
  ];

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2" ref={rootRef}>
        <span className="text-sm font-semibold text-emerald-950">{labels.sort}</span>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={buka}
            onClick={() => setBuka((v) => !v)}
            className="inline-flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:w-auto sm:min-w-56"
          >
            <span className="inline-flex items-center gap-2">
              {PilihIcon ? (
                <PilihIcon className="h-4 w-4 text-emerald-600" aria-hidden />
              ) : (
                <span className="w-4 text-center text-xs font-bold text-emerald-600">{dipilih.teks}</span>
              )}
              {dipilih.label}
            </span>
            <ChevronUp
              className={`h-4 w-4 text-emerald-700 transition-transform ${buka ? "" : "rotate-180"}`}
              aria-hidden
            />
          </button>

          {buka && (
            <div
              role="listbox"
              aria-label={labels.sort}
              className="absolute right-0 top-full z-50 mt-2 w-full min-w-64 overflow-hidden rounded-2xl border border-emerald-200 bg-white p-1.5 shadow-xl shadow-emerald-900/10 sm:w-72"
            >
              {opsiSort.map((o) => {
                const aktif = sort === o.value;
                const Icon = o.Icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={aktif}
                    onClick={() => pilihSort(o.value)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      aktif
                        ? "bg-emerald-50 font-semibold text-emerald-900"
                        : "text-zinc-700 hover:bg-emerald-50"
                    }`}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <span className="w-4 shrink-0 text-center text-xs font-bold text-emerald-600">{o.teks}</span>
                    )}
                    <span className="flex-1">{o.label}</span>
                    {aktif && <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={labels.view}
        className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-white p-1 sm:w-auto"
      >
        {opsiView.map(({ key, label, Icon }) => {
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
                aktif ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-emerald-50"
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
  for (const [k, v] of Object.entries(params)) if (v && !(k in patch)) sp.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v) sp.set(k, v);
    else sp.delete(k);
  }
  const s = sp.toString();
  return s ? `/pohon?${s}` : "/pohon";
}
