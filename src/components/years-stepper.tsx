"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MAX_YEARS } from "@/lib/cart";

// Stepper durasi tahun tanpa batas atas yang terlihat: tombol − / + dan
// input angka bebas (guard keamanan ada di lapisan simpan, bukan UI).
export default function YearsStepper({
  years,
  onChange,
  minusAria,
  plusAria,
  inputAria,
  unit,
  size = "md",
}: {
  years: number;
  onChange: (y: number) => void;
  minusAria: string;
  plusAria: string;
  inputAria: string;
  unit: string;
  size?: "sm" | "md";
}) {
  const [text, setText] = useState(String(years));
  useEffect(() => setText(String(years)), [years]);

  const btn =
    size === "sm"
      ? "h-7 w-7 text-emerald-700"
      : "h-9 w-9 text-emerald-700";
  const box = size === "sm" ? "h-7" : "h-9";

  const commit = (raw: string) => {
    const n = Math.min(MAX_YEARS, Math.max(1, Math.floor(Number(raw.replace(/\D/g, "")) || 1)));
    setText(String(n));
    onChange(n);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white">
        <button
          type="button"
          aria-label={minusAria}
          disabled={years <= 1}
          onClick={() => onChange(Math.max(1, years - 1))}
          className={`flex ${btn} items-center justify-center rounded-full transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
        >
          <Minus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
        <span className={`flex ${box} items-center gap-1 px-1`}>
          <input
            type="text"
            inputMode="numeric"
            aria-label={inputAria}
            value={text}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              setText(digits);
              if (digits) onChange(Math.min(MAX_YEARS, Number(digits)));
            }}
            onBlur={() => commit(text)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(text);
            }}
            className={`${
              size === "sm" ? "w-10" : "w-12"
            } bg-transparent text-center text-sm font-semibold text-emerald-800 outline-none`}
          />
          <span
            className={`pr-2 font-medium text-zinc-500 ${
              size === "sm" ? "text-[11px]" : "text-xs"
            }`}
          >
            {unit}
          </span>
        </span>
        <button
          type="button"
          aria-label={plusAria}
          disabled={years >= MAX_YEARS}
          onClick={() => onChange(Math.min(MAX_YEARS, years + 1))}
          className={`flex ${btn} items-center justify-center rounded-full transition-colors hover:bg-emerald-50`}
        >
          <Plus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </div>
    </div>
  );
}
