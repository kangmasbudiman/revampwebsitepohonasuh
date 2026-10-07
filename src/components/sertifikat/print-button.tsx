"use client";

import { Printer } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export default function PrintButton() {
  const t = useI18n().dict.sertifikat;
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
    >
      <Printer className="h-4 w-4" /> {t.print}
    </button>
  );
}
