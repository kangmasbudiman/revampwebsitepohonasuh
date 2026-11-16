"use client";

import { useRef, useState } from "react";
import { uploadDokumenMitra } from "@/lib/actions/mitra";
import SubmitButton from "@/components/admin/submit-button";
import { FileText, Info, TriangleAlert, X } from "lucide-react";

type Props = {
  token: string;
  hasProfil: boolean;
  hasLegal: boolean;
  hasSurat: boolean;
};

const DOCS = [
  { name: "profil_org", label: "Profil Organisasi", exts: ["pdf"], hint: "PDF, maks 5 MB", suggested: true },
  { name: "dokumen_legal", label: "Dokumen Legalitas", exts: ["pdf", "jpg", "jpeg", "png", "webp"], hint: "Sertifikat pendirian / SK — PDF/JPG/PNG/WebP, maks 5 MB", suggested: false },
  { name: "surat_penunjukan", label: "Surat Penunjukan Penanggung Jawab", exts: ["pdf", "jpg", "jpeg", "png", "webp"], hint: "PDF/JPG/PNG/WebP, maks 5 MB", suggested: false },
] as const;

export default function UploadDokumenForm({ token, hasProfil, hasLegal, hasSurat }: Props) {
  const [errs, setErrs] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const stored = { profil_org: hasProfil, dokumen_legal: hasLegal, surat_penunjukan: hasSurat };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = formRef.current;
    if (!form) return;
    const found = DOCS.map((d) => ({
      ...d,
      file: (form.elements.namedItem(d.name) as HTMLInputElement | null)?.files?.[0] ?? null,
    }));
    const problems: string[] = [];
    for (const d of found) {
      if (!d.file) continue;
      const ext = d.file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!d.exts.includes(ext as never)) {
        problems.push(`${d.label} harus berformat ${d.exts.join("/").toUpperCase()}.`);
      } else if (d.file.size > 5_000_000) {
        problems.push(`${d.label} maksimal 5 MB.`);
      }
    }
    if (!found.some((d) => d.file)) problems.push("Pilih minimal satu file untuk diunggah.");

    if (problems.length) {
      e.preventDefault();
      setErrs(problems);
      return;
    }
    setErrs([]);
  };

  const inputClass =
    "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700";

  return (
    <form ref={formRef} action={uploadDokumenMitra} noValidate encType="multipart/form-data" onSubmit={onSubmit} className="mt-4 space-y-4">
      <input type="hidden" name="token" value={token} />

      {DOCS.map((d) => (
        <div key={d.name} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
          <label htmlFor={d.name} className="flex items-center justify-between gap-2 text-sm font-semibold text-emerald-900">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" aria-hidden />
              {d.label}
            </span>
            {stored[d.name] && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Tersimpan</span>
            )}
          </label>
          <input id={d.name} type="file" name={d.name} accept={d.exts.map((e) => "." + e).join(",")} className={inputClass} />
          <p className="mt-1 text-[11px] text-zinc-500">{d.hint}{stored[d.name] ? " — mengunggah ulang akan menggantikan yang lama." : ""}</p>
        </div>
      ))}

      {errs.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div>
            <p className="font-semibold">Ada yang perlu diperbaiki:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {errs.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
          <button type="button" onClick={() => setErrs([])} aria-label="Tutup" className="ml-auto rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-600">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Info className="h-3.5 w-3.5" aria-hidden />Tautan berlaku 24 jam dan hanya bisa dipakai sekali.
        </p>
        <SubmitButton pendingLabel="Mengunggah…" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700">
          Kirim Dokumen
        </SubmitButton>
      </div>
    </form>
  );
}
