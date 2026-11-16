"use client";

import { useState } from "react";

// Ikon SVG persis mengikuti mobile app — globe, sparkles, users, newspaper,
// facebook, youtube, instagram, tiktok, linkedin, x, megaphone, more.
const OPTIONS = [
  { id: "pencarian_google", label: "Pencarian Google", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174a7.637 7.637 0 0 1-7.636-7.637 7.637 7.637 0 0 1 7.636-7.637c4.816 0 7.78 2.815 7.78 6.743 0 .454-.047.797-.115 1.23H12.24zm0 10.036v-2.088c2.57 0 4.773-1.63 5.52-3.172h2.41c-.803 2.052-3.687 5.108-7.93 5.108z"/></svg>
  )},
  { id: "asisten_ai", label: "Asisten AI", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 1l2.242 5.155a3.4 3.4 0 0 0 2.164 2.164L21.56 10.56a.858.858 0 0 1 0 1.713l-5.155 2.242a3.4 3.4 0 0 0-2.164 2.164L12 23l-2.242-5.155a3.4 3.4 0 0 0-2.164-2.164L2.44 13.737a.858.858 0 0 1 0-1.713l5.155-2.242a3.4 3.4 0 0 0 2.164-2.164L12 1zm0 6.6a1.782 1.782 0 0 1-1.32.632 1.782 1.782 0 0 1-.632-1.32V12a1.782 1.782 0 0 1 .632 1.32A1.782 1.782 0 0 1 12 17.4a1.782 1.782 0 0 1-.632-.632V12a1.782 1.782 0 0 1 .632-1.32A1.782 1.782 0 0 1 12 4.4z"/></svg>
  )},
  { id: "rekomendasi_teman", label: "Rekomendasi Teman", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm8 0c.68 0 1.56.46 2.4 1.43l3.07 3.57H8v-2c0-.47.26-.93.73-1.37C10.33 14.5 12.52 14 16 14z"/></svg>
  )},
  { id: "berita_artikel", label: "Berita / Artikel", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M3 4h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm2 3v11h14V7H5zm2 2h4v4H7V9zm6 1h4v2h-4zm0 3h4v2h-4zM7 15h4v2H7z"/></svg>
  )},
  { id: "facebook", label: "Facebook", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.971H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  )},
  { id: "youtube", label: "YouTube", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/></svg>
  )},
  { id: "instagram", label: "Instagram", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.07 1.645.07 4.85s-.012 3.584-.07 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85C2.57 3.922 4.087 2.375 7.343 2.227 8.606 2.17 8.983 2.158 12 2.158zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
  )},
  { id: "tiktok", label: "TikTok", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.89 2.89 0 0 1 .355-2.531 2.894 2.894 0 0 1 1.806-1.368V9.7a4.632 4.632 0 0 1-6.199 4.201 4.638 4.638 0 0 1-2.466-2.27 4.645 4.645 0 0 1-.007-3.4 4.638 4.638 0 0 1 1.88-2.147 4.649 4.649 0 0 1 4.494 0v3.38a3.072 3.072 0 0 0-2.255 1.239 3.073 3.073 0 0 0 .179 3.34 3.074 3.074 0 0 0 2.248 1.062 3.07 3.07 0 0 0 2.138-.888c.334-.32.567-.748.662-1.213 0-.148.006-2.001 0-4.001V6.685h3.828c.02 1.35.944 2.57 2.252 3.161 1.309.592 2.73.326 3.774-.787a4.449 4.449 0 0 0 .887-2.373z"/></svg>
  )},
  { id: "linkedin", label: "LinkedIn", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667h-3.554V9h3.413v1.561h.049c.476-.9 1.637-1.849 3.371-1.849 3.607 0 4.271 2.37 4.271 5.455v6.315zM5.337 7.433a2.062 2.062 0 1 1-.001-4.124 2.062 2.062 0 0 1 .001 4.124zM7.115 20.452H3.554V9h3.561v11.452zM23.82 0H.22C.099 0 0 .099 0 .22v23.56c0 .121.099.22.22.22h23.6c.121 0 .22-.099.22-.22V.22c0-.121-.099-.22-.22-.22z"/></svg>
  )},
  { id: "x_twitter", label: "X (Twitter)", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M18.244 3.25h3.308l-7.227 8.262L24 22.75h-6.555l-5.136 6.715-7.212-8.332L1.215 20.75h6.557L11.36 14.034 4.811 3.25h6.555l5.138 6.715z"/></svg>
  )},
  { id: "dari_mulut_ke_mulut", label: "Dari mulut ke mulut", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M3 11V6a2 2 0 0 1 2-2h13l-3.8 4.15a2 2 0 0 0-.382.945L12.6 12.43a2 2 0 0 0-1.88 1.595L10 17.36V22H8v-5a3 3 0 0 1 .65-1.885l.35-.41 1.06-4.285A.95.95 0 0 0 10 9.064V8H5a.5.5 0 0 0-.5.5v3.636a.5.5 0 0 0 .225.415l4.332 3.045a.5.5 0 0 0 .436 0L14.5 12v-.5h2.064l.854.912A1.5 1.5 0 0 0 19 13.4V12.022a.5.5 0 0 0-.5-.5H3z"/></svg>
  )},
  { id: "lainnya", label: "Lainnya", svg: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
  )},
];

export default function SumberInfoForm({ token }: { token: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pilih = async (value: string) => {
    setSelected(value);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sumber-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sumber_info: value }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setDone(true);
    } catch {
      setError("Gagal menyimpan jawaban. Coba lagi.");
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-emerald-800">Terima kasih! 🌱</p>
        <p className="mt-2 text-sm text-zinc-600">
          Jawaban Anda sudah tersimpan dan sangat membantu kami.
        </p>
        <a
          href="/masuk"
          className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Lanjut Masuk →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Personalisasi Pengalaman header — same as mobile */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">Personalisasi Pengalaman</p>
        <p className="text-xs font-medium text-zinc-500">1 dari 2</p>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100">
        <div className="h-full w-1/2 rounded-full bg-green-500" />
      </div>

      <h2 className="mt-5 text-center text-xl font-bold text-emerald-950">
        Bagaimana Anda<br />mengetahui tentang <span className="text-green-600">Pohon Asuh?</span>
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {OPTIONS.map((o) => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => pilih(o.id)}
              disabled={saving}
              className={`flex min-h-[52px] items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                active
                  ? "border-green-500 bg-green-100 text-emerald-900 shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-800 hover:border-emerald-200 hover:bg-emerald-50"
              } ${saving ? "opacity-60" : ""}`}
            >
              <span className="shrink-0 text-emerald-700">{o.svg}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}

      <a href="/masuk" className="mt-6 block text-center text-xs font-semibold text-emerald-700 hover:underline">
        Lewati →
      </a>
    </div>
  );
}
