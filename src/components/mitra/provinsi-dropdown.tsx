"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  options: string[];
  defaultValues?: string[];
};

// Dropdown provinsi multi-select: klik caret ▾ untuk membuka daftar opsi
// (checkbox) lalu pilih satu atau lebih provinsi.
export default function ProvinsiDropdown({ name, options, defaultValues = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onAway = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onAway);
    return () => document.removeEventListener("mousedown", onAway);
  }, []);

  const toggle = (v: string) => {
    setSelected((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  };

  const label = selected.length ? `${selected.length} provinsi dipilih` : "Pilih provinsi…";

  return (
    <div ref={wrapRef} className="relative">
      <input type="hidden" name={name} value={selected.join(",")} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
      >
        <span className={selected.length ? "truncate" : "text-zinc-400"}>{label}</span>
        <span className={`text-xs text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-emerald-100 bg-white p-1 shadow-lg dark:border-night-700 dark:bg-night-950">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-400">Belum ada data provinsi.</div>
          ) : (
            options.map((p) => (
              <label
                key={p}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  selected.includes(p) ? "bg-emerald-50 text-emerald-800" : "text-zinc-700 hover:bg-emerald-50"
                } dark:text-zinc-200`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p)}
                  onChange={() => toggle(p)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="truncate">{p}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
