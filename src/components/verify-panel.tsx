"use client";

import { useActionState, useState } from "react";
import { verifyAdoption, rejectAdoption, type AdminState } from "@/lib/actions/admin";

export default function VerifyPanel({ confirmasiId }: { confirmasiId: number }) {
  const [verifyState, verifyAction, verifying] = useActionState<AdminState, FormData>(verifyAdoption, {});
  const [rejectState, rejectAction, rejecting] = useActionState<AdminState, FormData>(rejectAdoption, {});
  const [rejectingOpen, setRejectingOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form action={verifyAction}>
          <input type="hidden" name="confirmasiId" value={confirmasiId} />
          <button
            type="submit"
            disabled={verifying}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {verifying ? "Memverifikasi..." : "✓ Verifikasi & Terbitkan Sertifikat"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setRejectingOpen((v) => !v)}
          className="rounded-xl border border-red-200 px-6 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          {rejectingOpen ? "Batal" : "Tolak Pembayaran"}
        </button>
      </div>

      {rejectingOpen && (
        <form action={rejectAction} className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <input type="hidden" name="confirmasiId" value={confirmasiId} />
          <p className="text-sm font-medium text-red-800">Batalkan order ini?</p>
          <p className="mt-1 text-sm leading-5 text-red-800/80">
            Order dihapus, semua pohon pada invoice dikembalikan ke tersedia, dan donatur
            menerima pemberitahuan pembatalan.
          </p>
          <button
            type="submit"
            disabled={rejecting}
            className="mt-3 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {rejecting ? "Menolak..." : "Konfirmasi Penolakan"}
          </button>
        </form>
      )}

      {verifyState.error && <p className="text-sm text-red-600">{verifyState.error}</p>}
      {rejectState.error && <p className="text-sm text-red-600">{rejectState.error}</p>}
    </div>
  );
}
