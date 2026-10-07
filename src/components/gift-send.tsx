"use client";

// Modal kirim sertifikat hadiah ke penerima (blok "Adopsi Aktif" di detail
// order). WhatsApp = deep-link wa.me dari sisi klien (tanpa gateway); Email =
// server action → endpoint kirimemailsertifikat (fail-soft bila SMTP belum
// dikonfigurasi). Pola modal: notifikasi-list (Escape + scroll-lock + fokus).

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Gift, Loader2, Mail, Send, X } from "lucide-react";
import { kirimSertifikatEmail, type GiftEmailState } from "@/lib/actions/gift";
import { useI18n } from "@/components/i18n-provider";

// Normalisasi nomor WA ke format 62xxx: buang non-digit, 0… → 62…, 8… → 62 8….
function normalizeWa(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("62")) return d;
  if (d.startsWith("8")) return "62" + d;
  return d;
}

export default function GiftSend({
  certnum,
  namaPenerima,
  namaPengirim,
  pohonLabel,
  link,
}: {
  certnum: string;
  namaPenerima: string;
  namaPengirim: string;
  pohonLabel: string;
  link: string;
}) {
  const { dict } = useI18n();
  const t = dict.dashboard.gift;
  const [open, setOpen] = useState(false);
  const [wa, setWa] = useState("");
  const [waErr, setWaErr] = useState("");
  const waRef = useRef<HTMLInputElement>(null);
  const [emailState, emailAction, emailPending] = useActionState<GiftEmailState, FormData>(
    kirimSertifikatEmail,
    {},
  );

  const pesanWa = t.waMessage
    .replaceAll("{recipient}", namaPenerima)
    .replaceAll("{sender}", namaPengirim)
    .replaceAll("{trees}", pohonLabel)
    .replaceAll("{link}", link);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => waRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const kirimWa = () => {
    const num = normalizeWa(wa);
    if (num.length < 9) {
      setWaErr(t.waError);
      return;
    }
    setWaErr("");
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(pesanWa)}`, "_blank", "noopener");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
      >
        <Gift className="h-4 w-4" />
        {t.sendButton}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-emerald-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t.modalAria}
        >
          <button
            type="button"
            aria-label={t.closeAria}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="animate-menu relative mt-[10vh] w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl shadow-emerald-950/30">
            <div className="flex items-center gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
                <Gift className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-emerald-950">{t.modalTitle}</p>
                <p className="truncate text-xs text-emerald-700/70">
                  {t.forLabel} {namaPenerima} · {pohonLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label={t.closeAria}
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/70">
                  {t.preview}
                </p>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-emerald-950">
                  {pesanWa}
                </p>
              </div>

              <div>
                <label htmlFor="gift-wa" className="text-sm font-semibold text-emerald-950">
                  {t.whatsapp}
                </label>
                <p className="mt-0.5 text-xs text-zinc-500">{t.waHint}</p>
                <div className="mt-2 flex gap-2">
                  <input
                    id="gift-wa"
                    ref={waRef}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="0812…"
                    value={wa}
                    onChange={(e) => {
                      setWa(e.target.value.replace(/\D/g, ""));
                      setWaErr("");
                    }}
                    className="w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={kirimWa}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <Send className="h-3.5 w-3.5" />
                    WA
                  </button>
                </div>
                {waErr && <p className="mt-1.5 text-xs text-red-600">{waErr}</p>}
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <label htmlFor="gift-email" className="text-sm font-semibold text-emerald-950">
                  {t.emailLabel}
                </label>
                <p className="mt-0.5 text-xs text-zinc-500">{t.emailHint}</p>
                <form action={emailAction} className="mt-2">
                  <input type="hidden" name="certnum" value={certnum} />
                  <input type="hidden" name="to_name" value={namaPenerima} />
                  <input type="hidden" name="link" value={link} />
                  <div className="flex gap-2">
                    <input
                      id="gift-email"
                      name="to_email"
                      type="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
                      className="w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                    <button
                      type="submit"
                      disabled={emailPending}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {emailPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                      Email
                    </button>
                  </div>
                </form>
                {emailState.pesan && (
                  <p
                    className={`mt-1.5 text-xs ${emailState.ok ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {emailState.pesan}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
