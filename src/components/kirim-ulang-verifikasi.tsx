"use client";

import { useState } from "react";
import { kirimUlangVerifikasi } from "@/lib/actions/auth";

// Tombol kirim ulang email verifikasi — dipakai /daftar (panel sukses),
// /masuk (akun belum terverifikasi), dan /verifikasi (token gagal).
// Cooldown 60 detik di sisi client; backend juga menegakkannya.
export default function KirimUlangVerifikasi({
  emailAwal,
  labels,
}: {
  emailAwal?: string;
  labels: { resend: string; resending: string; sent?: string };
}) {
  const [email, setEmail] = useState(emailAwal ?? "");
  const [perluEmail] = useState(!emailAwal);
  const [mengirim, setMengirim] = useState(false);
  const [pesan, setPesan] = useState("");

  const kirim = async () => {
    if (mengirim) return;
    if (perluEmail && !email.trim()) {
      setPesan("Masukkan email Anda.");
      return;
    }
    setMengirim(true);
    const r = await kirimUlangVerifikasi(email.trim());
    setPesan(labels.sent && r.ok ? labels.sent : r.pesan);
    setMengirim(false);
  };

  return (
    <div>
      {perluEmail && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@anda.com"
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      )}
      <button
        type="button"
        onClick={kirim}
        disabled={mengirim}
        className="mt-2 w-full rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
      >
        {mengirim ? labels.resending : labels.resend}
      </button>
      {pesan && <p className="mt-2 text-xs text-zinc-500">{pesan}</p>}
    </div>
  );
}
