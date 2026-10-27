"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { MAX_UPLOAD_BYTES } from "@/lib/file-guard";

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

// Input file dengan kawal ukuran 2MB + pesan error inline custom.
// Sengaja TANPA setCustomValidity/required native — bubble bawaan browser
// tidak cocok dengan tema; file besar langsung dikosongkan dan submit
// diblokir lewat listener (stopPropagation mencegah server action jalan),
// sementara form tanpa file ditangkap validasi server yang ramah.
export default function FileInput({
  name,
  accept = "image/jpeg,image/png,image/webp",
  className = "mt-1",
  multiple = false,
  onFileChange,
}: {
  name: string;
  accept?: string;
  className?: string;
  multiple?: boolean;
  onFileChange?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<{ nama: string; ukuran: number } | null>(null);
  const [siap, setSiap] = useState<{ nama: string; ukuran: number }[]>([]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onSubmit = (e: SubmitEvent) => {
      if (error) {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [error]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []);
    if (files.length === 0) {
      setError(null);
      setSiap([]);
      onFileChange?.(null);
      return;
    }
    const besar = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (besar) {
      setSiap([]);
      setError({ nama: besar.name, ukuran: besar.size });
      e.currentTarget.value = "";
      onFileChange?.(null);
      return;
    }
    setError(null);
    setSiap(files.map((f) => ({ nama: f.name, ukuran: f.size })));
    onFileChange?.(files[0] ?? null);
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        aria-invalid={!!error}
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:font-medium file:text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:bg-night-950 dark:text-zinc-100 dark:file:bg-night-800 dark:file:text-emerald-300 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40 ${
          error
            ? "border-red-300 dark:border-red-900/60"
            : "border-zinc-200 dark:border-night-700"
        }`}
      />

      {error && (
        <div
          role="alert"
          data-testid="file-error"
          className="mt-2 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-900/60 dark:bg-red-950/40"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
            <TriangleAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Ukuran file terlalu besar
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-600/90 dark:text-red-400/90">
              <span className="font-medium break-all">{error.nama}</span> ({mb(error.ukuran)}) melebihi
              batas <span className="font-medium">maksimal 2 MB</span> — kompres dulu atau pilih file
              yang lebih kecil.
            </p>
          </div>
        </div>
      )}

      {siap.length > 0 && !error && (
        <ul data-testid="file-ok" className="mt-2 space-y-1">
          {siap.map((f) => (
            <li
              key={f.nama}
              className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300"
            >
              <CircleCheck className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{f.nama}</span>
              <span className="shrink-0 text-emerald-600/70 dark:text-emerald-400/70">
                ({mb(f.ukuran)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
