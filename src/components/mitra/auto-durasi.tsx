"use client";

import { useEffect } from "react";

// Auto-populate durasi kegiatan dari rentang tanggal (tgl_mulai → tgl_selesai)
// saat user memilih tanggal pada form program mitra.
export default function AutoDurasi() {
  useEffect(() => {
    const compute = () => {
      const elMulai = document.getElementById("tgl_mulai") as HTMLInputElement | null;
      const elSelesai = document.getElementById("tgl_selesai") as HTMLInputElement | null;
      const elDurasi = document.getElementById("durasi") as HTMLInputElement | null;
      if (!elMulai || !elSelesai || !elDurasi) return;
      const s = elMulai.value;
      const e = elSelesai.value;
      if (!s || !e) {
        elDurasi.value = "";
        return;
      }
      const a = new Date(`${s}T00:00:00`);
      const b = new Date(`${e}T00:00:00`);
      let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
      if (b.getDate() < a.getDate()) m -= 1;
      elDurasi.value = `${Math.max(0, m)} bulan`;
    };
    compute();
    const elMulai = document.getElementById("tgl_mulai");
    const elSelesai = document.getElementById("tgl_selesai");
    elMulai?.addEventListener("change", compute);
    elSelesai?.addEventListener("change", compute);
    return () => {
      elMulai?.removeEventListener("change", compute);
      elSelesai?.removeEventListener("change", compute);
    };
  }, []);

  return null;
}
