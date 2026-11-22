"use client";

import { useEffect } from "react";
import { durasiDariTanggal } from "@/lib/format";

// Auto-populate durasi kegiatan dari rentang tanggal (tgl_mulai → tgl_selesai)
// saat user memilih tanggal pada form program mitra. Target default "durasi"
// (elemen read-only/info); pakai targetId di popup/modal.
export default function AutoDurasi({
  mulaiId = "tgl_mulai",
  selesaiId = "tgl_selesai",
  targetId = "durasi",
}: { mulaiId?: string; selesaiId?: string; targetId?: string } = {}) {
  useEffect(() => {
    const compute = () => {
      const elMulai = document.getElementById(mulaiId) as HTMLInputElement | null;
      const elSelesai = document.getElementById(selesaiId) as HTMLInputElement | null;
      const elDurasi = document.getElementById(targetId) as HTMLInputElement | HTMLSpanElement | null;
      if (!elMulai || !elSelesai || !elDurasi) return;
      const val = durasiDariTanggal(elMulai.value, elSelesai.value);
      if (elDurasi instanceof HTMLInputElement) elDurasi.value = val;
      else elDurasi.textContent = val;
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
  }, [mulaiId, selesaiId, targetId]);

  return null;
}
