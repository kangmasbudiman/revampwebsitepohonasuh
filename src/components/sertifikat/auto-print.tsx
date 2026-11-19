"use client";

// Otomatis memanggil dialog print saat halaman dimuat lewat ?autoprint=1
// (tombol "Download" di panel mitra) — pengguna menyimpan sebagai PDF dari
// dialog browser.

import { useEffect } from "react";

export default function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
