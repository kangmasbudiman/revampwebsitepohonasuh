"use client";

import { useEffect } from "react";

// Saat fallback loading menggantikan konten lama, posisi scroll halaman
// sebelumnya dipertahankan — fallback yang tinggi ter-scroll melewati
// (footer melompat ke tengah layar). Naikkan ke atas setiap kali fallback
// tampil agar loader berada di tengah viewport.
export default function ScrollTopOnMount() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}
