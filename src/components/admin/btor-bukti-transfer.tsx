"use client";

import { useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { ImageUp, ReceiptText } from "lucide-react";
import LaporanFotoPopup from "@/components/admin/laporan-foto-popup";
import { unggahBuktiMemoBtor } from "@/lib/actions/btor";

// Bukti transfer pencairan dana memo BTOR: thumbnail klik → popup galeri
// (pola foto laporan); form unggah/ganti hanya untuk role ber-izin memo.
function TombolUnggah({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="bukti-upload-btn"
      className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:bg-night-950 dark:text-emerald-300 dark:hover:bg-night-800"
    >
      <ImageUp className="h-4 w-4" />
      {pending ? "Mengunggah…" : label}
    </button>
  );
}

export default function BtorBuktiTransfer({
  idbtor,
  memo,
  bolehUnggah,
}: {
  idbtor: number;
  memo: { id: number; nomor: string; buktiPencairan: string };
  bolehUnggah: boolean;
}) {
  const [lihat, setLihat] = useState(false);
  const labelUnggah = memo.buktiPencairan ? "Ganti Bukti" : "Unggah Bukti";

  return (
    <div
      data-testid="bukti-wrap"
      className="mt-4 rounded-xl border border-emerald-100 px-4 py-3 dark:border-emerald-900/50"
    >
      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        <ReceiptText className="h-3.5 w-3.5" />
        Bukti Transfer
      </h4>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {memo.buktiPencairan ? (
          <button
            type="button"
            data-testid="bukti-thumb"
            aria-label="Lihat bukti transfer"
            onClick={() => setLihat(true)}
            className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-emerald-100 transition-shadow hover:shadow-md dark:border-emerald-900"
          >
            <Image
              src={memo.buktiPencairan}
              alt="Bukti transfer pencairan dana"
              fill
              sizes="112px"
              className="object-cover"
            />
          </button>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="bukti-kosong">
            Belum ada bukti transfer diunggah.
          </p>
        )}
        {bolehUnggah && (
          <form
            action={unggahBuktiMemoBtor}
            data-testid="bukti-form"
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="idbtor" value={idbtor} />
            <input type="hidden" name="id_memo" value={memo.id} />
            <label
              className="cursor-pointer rounded-xl border border-dashed border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              {labelUnggah} (JPG/PNG/WEBP, maks 2MB)
              <input
                type="file"
                name="bukti"
                data-testid="bukti-input"
                accept="image/jpeg,image/png,image/webp"
                required
                className="sr-only"
              />
            </label>
            <TombolUnggah label={labelUnggah} />
          </form>
        )}
      </div>
      {lihat && memo.buktiPencairan && (
        <LaporanFotoPopup
          judul={`Bukti Transfer ${memo.nomor}`}
          entity="bukti transfer"
          fotos={[{ id: memo.id, url: memo.buktiPencairan }]}
          onClose={() => setLihat(false)}
        />
      )}
    </div>
  );
}
