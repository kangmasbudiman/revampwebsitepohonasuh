"use client";

import { useState, type ReactNode } from "react";

// Wadah tab untuk halaman detail BTOR — konten tiap tab disiapkan
// server-side lalu dikirim sebagai ReactNode.
export default function BtorDetailTabs({
  tabs,
  initial = 0,
}: {
  tabs: { key: string; label: string; badge?: string; content: ReactNode }[];
  initial?: number;
}) {
  const [aktif, setAktif] = useState(initial);
  const t = tabs[aktif];
  if (!t) return null;

  return (
    <div>
      <div
        className="flex gap-1 overflow-x-auto rounded-2xl border border-emerald-100 bg-white p-1.5 dark:border-night-700 dark:bg-night-900"
        role="tablist"
        data-testid="btor-tabs"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={i === aktif}
            onClick={() => setAktif(i)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              i === aktif
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-zinc-600 hover:bg-emerald-50 dark:text-zinc-300 dark:hover:bg-night-800"
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  i === aktif ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-night-800 dark:text-emerald-300"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-5" data-testid={`tab-panel-${t.key}`}>
        {t.content}
      </div>
    </div>
  );
}
