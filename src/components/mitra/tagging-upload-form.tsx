"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, UploadCloud, X } from "lucide-react";
import SubmitButton from "@/components/admin/submit-button";

type Props = {
  programId: number;
  action: (formData: FormData) => Promise<void>;
};

export default function TaggingUploadForm({ programId, action }: Props) {
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
