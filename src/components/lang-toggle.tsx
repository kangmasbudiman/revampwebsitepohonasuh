"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/components/i18n-provider";

// Pil ID/EN: tulis cookie pa_lang lalu refresh agar server components
// membaca ulang kamus (tanpa navigasi, tanpa prefix URL).
//
// `locale` dari context adalah nilai SERVER — saat refresh sebelumnya masih
// di udara, nilainya basi. Membandingkan klik terhadapnya membuat klik
// cepat id→en→id DIABAIKAN diam-diam (cookie tertinggal di bahasa lama).
// Pil aktif karena itu memakai state optimistik yang disinkronkan kembali
// setiap context server baru turun.
export default function LangToggle({ overlay = false }: { overlay?: boolean }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aktif, setAktif] = useState(locale);
  useEffect(() => setAktif(locale), [locale]);

  const ganti = (next: "id" | "en") => {
    if (next === aktif) return;
    setAktif(next);
    start(() => {
      document.cookie = `pa_lang=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    });
  };

  const base = overlay
    ? "border-white/30 bg-white/10 text-white"
    : "border-emerald-200 bg-white text-emerald-900";

  return (
    <div
      className={`flex items-center overflow-hidden rounded-full border text-[11px] font-bold ${base} ${
        pending ? "opacity-60" : ""
      }`}
      role="group"
      aria-label="Pilih bahasa / Switch language"
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => ganti(l)}
          aria-pressed={aktif === l}
          className={`px-2.5 py-1 uppercase tracking-wide transition-colors ${
            aktif === l
              ? overlay
                ? "bg-white text-emerald-800"
                : "bg-emerald-600 text-white"
              : overlay
                ? "text-white/80 hover:text-white"
                : "text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
