"use client";

import { useEffect } from "react";

// Auto-populate durasi kegiatan dari rentang tanggal (tgl_mulai → tgl_selesai)
// saat user memilih tanggal pada form program mitra. ID default "tgl_mulai"/
// "tgl_selesai"/"durasi" — pakai `*Id` saat form berada di popup/modal
// (ID ganda di DOM ditangani oleh id unik).
export default function AutoDurasi({
  mulaiId = "tgl_mulai",
  selesaiId = "tgl_selesai",
  durasiId = "durasi",
}: { mulaiId?: string; selesaiId?: string; durasiId?: string } = {}) {
  useEffect(() => {
    const compute = () => {
      const elMulai = document.getElementById(mulaiId) as HTMLInputElement | null;
      const elSelesai = document.getElementById(selesaiId) as HTMLInputElement | null;
      const elDurasi = document.getElementById(durasiId) as HTMLInputElement | null;
      if (!elMulai || !elSelesai || !elDurasi) return;
      const s = elMulai.value;
      const e = elSelesai.value;
      if (!s || !e) {
        elDurasi.value = "";
        return;
      }
      const a = new Date(`${s}T00:00:00`);
      const b = new Date(`${e}T00:00:00`);
      let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
      let days = b.getDate() - a.getDate();
      if (days < 0) {
        months -= 1;
        days += new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
      }
      const mm = Math.max(0, months);
      const dd = Math.max(0, days);
      const val = mm > 0 && dd > 0 ? `${mm} bulan ${dd} hari` : mm > 0 ? `${mm} bulan` : `${dd} hari`;
      elDurasi.value = val;
    };
    compute();
    const elMulai = document.getElementById(mulaiId);
    const elSelesai = document.getElementById(selesaiId);
    elMulai?.addEventListener("change", compute);
    elSelesai?.addEventListener("change", compute);
    return () => {
      elMulai?.removeEventListener("change", compute);
      elSelesai?.removeEventListener("change", compute);
    };
  }, [mulaiId, selesaiId, durasiId]);

  return null;
}
