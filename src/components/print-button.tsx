"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Cetak / Download PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => { if (typeof window !== "undefined") window.print(); }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
    >
      <Printer className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
