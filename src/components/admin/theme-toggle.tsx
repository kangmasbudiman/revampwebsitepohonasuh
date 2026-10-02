"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => {
      // Saat benar-benar meninggalkan area admin (unmount), jangan biarkan
      // dark bocor ke halaman publik. Guard pathname menahan strict-mode
      // double-invoke (cleanup saat masih di /admin = no-op).
      if (!location.pathname.startsWith("/admin")) {
        document.documentElement.classList.remove("dark");
      }
    };
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pa_theme", next ? "dark" : "light");
    } catch {
      // localStorage bisa diblokir — biarkan toggle sesi ini saja
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={isDark ? "Mode terang" : "Mode gelap"}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        onDark
          ? "text-emerald-200 hover:bg-white/10 hover:text-white"
          : "text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-night-700"
      } ${className}`}
    >
      {isDark ? <Sun className="h-[1.1em] w-[1.1em]" /> : <Moon className="h-[1.1em] w-[1.1em]" />}
    </button>
  );
}
