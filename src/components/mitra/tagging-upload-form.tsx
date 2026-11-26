"use client";

import { useEffect, useRef, useState } from "react";
import { FileImage, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import SubmitButton from "@/components/admin/submit-button";

type Props = {
  programId: number;
  action: (formData: FormData) => Promise<void>;
  savedTemplateUrl?: string | null;
};

const BACKGROUND_BAWAAN = "/images/sertifikat/bg.png";

// Contoh lembar sertifikat dengan posisi teks yang sama seperti halaman
// sertifikat asli — dipakai mitra untuk mengecek apakah desain upload-nya
// tidak menutupi area teks.
function ContohSertifikat({ backgroundUrl }: { backgroundUrl: string }) {
  return (
    <div className="relative aspect-[828/585.6] w-full overflow-hidden rounded-lg bg-[#f5f5e3] shadow-sm [container-type:inline-size]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backgroundUrl}
        alt="Contoh latar sertifikat"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 font-sans">
        <p className="absolute top-[2.27%] right-[2.66%] text-[1.45cqw] text-[#208745]">
          No. 001/CONTOH/2026
        </p>
        <p className="absolute top-[27.45%] left-[23.91%] w-[72.2%] text-[1.69cqw] leading-[1.07] text-[#545353]">
          Pohonasuh dimaknai sebagai penghargaan publik yang diberikan
          <br />
          kepada masyarakat atas kontribusinya dalam merawat pohon di hutan.
          <br />
          <br />
          Kami memberikan apresiasi dan terima kasih kepada:
        </p>
        <p className="absolute top-[38.3%] left-[23.83%] w-[72.5%] truncate text-[5.2cqw] font-bold leading-[1.02] text-[#208745]">
          NAMA PENGADOPSI
        </p>
        <p className="absolute top-[47.95%] left-[23.75%] w-[72.3%] text-[1.69cqw] leading-[1.14] text-[#545353]">
          telah mengadopsi 3 pohon di Nagari Contoh,
          <br />
          Kec. Contoh, Kab. Contoh, Prov. Contoh, INDONESIA.
          <br />
          dari 2026-01-01 sampai 2027-01-01.
        </p>
        <p className="absolute top-[58.5%] left-[23.75%] text-[2.58cqw] font-medium text-[#208745]">
          Pesan dan Kesan:
        </p>
        <p className="absolute top-[63%] left-[23.99%] w-[63.5%] truncate text-[1.5cqw] leading-[1.22] text-[#3f3e3e]">
          Contoh pesan singkat dari pengadopsi.
        </p>
        <p className="absolute top-[72.89%] left-[23.91%] text-[2.58cqw] font-medium text-[#208745]">
          Jambi, 2026
        </p>
        <div className="absolute top-[78.2%] left-[23.91%] w-[54%]">
          <p className="text-[1.24cqw] font-semibold tracking-wide text-[#208745] uppercase">
            Pohon yang Diadopsi
          </p>
          <ul className="mt-[0.5cqw] space-y-[0.28cqw] text-[1.12cqw] leading-[1.32] text-[#545353]">
            <li>SWA0001 · Contoh pohon · Ø 20 cm</li>
            <li>SWA0002 · Contoh pohon · Ø 22 cm</li>
            <li>SWA0003 · Contoh pohon · Ø 24 cm</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function TaggingUploadForm({ programId, action, savedTemplateUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  function hapusFile() {
    if (inputRef.current) inputRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName("");
  }

  const background = preview ?? savedTemplateUrl ?? BACKGROUND_BAWAAN;

  return (
    <form action={action}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <UploadCloud className="h-3.5 w-3.5" /> Desain Sendiri
      </div>

      <input type="hidden" name="program_id" value={programId} />
      <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-3 transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-950/40 dark:hover:border-emerald-600">
        <span className="sr-only">Pilih file desain</span>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/*"
          required
          onChange={handleChange}
          className="w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 dark:text-zinc-300 dark:file:bg-emerald-600 dark:file:text-white dark:hover:file:bg-emerald-700"
        />
      </label>

      {preview && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-2.5 dark:border-night-700 dark:bg-night-950">
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-zinc-50 dark:bg-night-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Pratinjau desain" className="h-full w-full object-contain" />
          </div>
          <div className="mt-2 flex items-center gap-2 px-0.5">
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              {fileName}
            </p>
            <button
              type="button"
              onClick={hapusFile}
              aria-label="Hapus file"
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-night-800 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Contoh sertifikat */}
      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 dark:border-night-700 dark:bg-night-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            <FileImage className="h-3.5 w-3.5" /> Contoh Sertifikat
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
            {preview ? "Dari file pilihan" : savedTemplateUrl ? "Desain tersimpan" : "Desain bawaan"}
          </span>
        </div>
        <div className="mt-3">
          <ContohSertifikat backgroundUrl={background} />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Teks pada contoh hanya simulasi. Perhatikan apakah area teks masih terbaca dan tidak tertutup
          gambar Anda. Desain ini juga dipakai sebagai latar sertifikat program.
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Format gambar (PNG/JPG/WebP).</p>
        <SubmitButton
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          pendingLabel="Mengunggah…"
          icon={UploadCloud}
        >
          Upload Desain
        </SubmitButton>
      </div>
    </form>
  );
}
