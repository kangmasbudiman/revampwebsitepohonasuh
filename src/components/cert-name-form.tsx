"use client";

// Form revisi nama penerima sertifikat untuk adopsi HADIAH. Ditempatkan di
// dashboard detail order dan di halaman sertifikat (pemilik). Server action
// menentukan sendiri apakah nama tagging ikut berubah (pohon belum masuk
// antrian tagging) atau hanya nama sertifikat yang diperbarui (proses >= 2).

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Pencil, UserRoundPen, X } from "lucide-react";
import { ubahNamaHadiah, type NamaHadiahState } from "@/lib/actions/sertifikat";
import { useI18n } from "@/components/i18n-provider";

export default function CertNameForm({
  certnum,
  nama,
  terkunci,
  kembali,
  variant = "pill",
}: {
  certnum: string;
  nama: string;
  terkunci: boolean;
  kembali?: string;
  variant?: "pill" | "card";
}) {
  const { dict } = useI18n();
  const t = dict.certName;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<NamaHadiahState, FormData>(
    ubahNamaHadiah,
    {},
  );

  const buka = () => {
    // Ganti key agar hasil action lama (sukses/error) tidak terbawa.
    setOpenKey((k) => k + 1);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const tombol =
    variant === "card" ? (
      <div className="no-print mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <UserRoundPen className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-emerald-950">{t.cardTitle}</h2>
            <p className="text-xs text-zinc-500">{t.cardDesc}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={buka}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t.button}
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={buka}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
      >
        <Pencil className="h-4 w-4" />
        {t.button}
      </button>
    );

  return (
    <>
      {tombol}

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-emerald-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
        >
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="animate-menu relative mt-[10vh] w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/30">
            <div className="flex items-center gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
                <UserRoundPen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-emerald-950">{t.title}</p>
                <p className="truncate text-xs text-emerald-700/70">{certnum}</p>
              </div>
              <button
                type="button"
                aria-label={t.close}
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                  terkunci
                    ? "border-amber-300 bg-amber-50"
                    : "border-emerald-100 bg-emerald-50/60"
                }`}
              >
                {terkunci && <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
                <div>
                  <p
                    className={`text-xs font-bold ${
                      terkunci ? "text-amber-900" : "text-emerald-900"
                    }`}
                  >
                    {terkunci ? t.lockedTitle : t.unlockedTitle}
                  </p>
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      terkunci ? "text-amber-900/80" : "text-emerald-900/80"
                    }`}
                  >
                    {terkunci ? t.lockedDesc : t.unlockedDesc}
                  </p>
                </div>
              </div>

              {state.ok ? (
                <>
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                    {state.terkunci ? t.savedLocked : t.saved}
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      {t.close}
                    </button>
                  </div>
                </>
              ) : (
                <form key={openKey} action={action} className="space-y-3">
                  <input type="hidden" name="certnum" value={certnum} />
                  {kembali && <input type="hidden" name="kembali" value={kembali} />}
                  <div>
                    <label htmlFor="cert-name" className="text-sm font-semibold text-emerald-950">
                      {t.label}
                    </label>
                    <input
                      id="cert-name"
                      ref={inputRef}
                      name="nama"
                      type="text"
                      required
                      maxLength={255}
                      defaultValue={nama}
                      placeholder={t.placeholder}
                      className="mt-1.5 w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {pending ? t.saving : t.save}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
