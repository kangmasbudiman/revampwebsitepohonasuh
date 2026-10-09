"use client";

import { useActionState, useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import Avatar from "@/components/avatar";
import FileInput from "@/components/file-input";
import { useI18n } from "@/components/i18n-provider";
import {
  gantiPassword,
  updateProfile,
  uploadFoto,
} from "@/lib/actions/profile";

export type ProfilData = {
  id: number;
  name: string;
  emaile: string;
  hp: string;
  job: string;
  address: string;
  foto: string | null;
};

const inputCls =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const labelCls = "block text-sm font-medium text-zinc-700";
const errCls = "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600";

export default function ProfileForm({ profil }: { profil: ProfilData }) {
  const { dict } = useI18n();
  const t = dict.dashboard.profil;
  const [dataState, dataAction, dataPending] = useActionState(updateProfile, {});
  const [fotoState, fotoAction, fotoPending] = useActionState(uploadFoto, {});
  const [pwState, pwAction, pwPending] = useActionState(gantiPassword, {});
  const [pwLama, setPwLama] = useState("");
  const [pwBaru, setPwBaru] = useState("");
  const [pwKonfirmasi, setPwKonfirmasi] = useState("");
  const pwSama = pwLama !== "" && pwBaru !== "" && pwBaru === pwLama;

  return (
    <div className="mt-6 space-y-6">
      {/* ==== Foto profil ==== */}
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-emerald-950">
          <UserRound className="h-4 w-4 text-emerald-600" /> {t.photoTitle}
        </h2>
        <form action={fotoAction} className="mt-4 flex flex-wrap items-start gap-6">
          <Avatar src={profil.foto} name={profil.name} size={88} className="ring-emerald-100" />
          <div className="min-w-[240px] flex-1">
            <label htmlFor="foto" className={labelCls}>
              {t.photoNew} <span className="text-zinc-400">{t.photoHint}</span>
            </label>
            <FileInput name="foto" className="mt-1" />
            {fotoState.error && <p className={`mt-3 ${errCls}`}>{fotoState.error}</p>}
            <button
              type="submit"
              disabled={fotoPending}
              className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {fotoPending ? t.uploading : t.savePhoto}
            </button>
          </div>
        </form>
      </section>

      {/* ==== Data diri ==== */}
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-emerald-950">{t.dataTitle}</h2>
        <form action={dataAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelCls}>
              {t.fullName} <span className="text-red-500">*</span>
            </label>
            <input id="name" name="name" required defaultValue={profil.name} className={inputCls} />
          </div>
          <div>
            <label htmlFor="emaile" className={labelCls}>
              {t.email}
            </label>
            <input
              id="emaile"
              value={profil.emaile}
              disabled
              className={`${inputCls} cursor-not-allowed bg-zinc-50 text-zinc-500`}
            />
            <p className="mt-1 text-xs text-zinc-400">{t.emailLocked}</p>
          </div>
          <div>
            <label htmlFor="hp" className={labelCls}>
              {t.phone} <span className="text-red-500">*</span>
            </label>
            <input
              id="hp"
              name="hp"
              required
              inputMode="tel"
              defaultValue={profil.hp}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="job" className={labelCls}>
              {t.job}
            </label>
            <input id="job" name="job" defaultValue={profil.job} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className={labelCls}>
              {t.address}
            </label>
            <textarea id="address" name="address" rows={3} defaultValue={profil.address} className={inputCls} />
          </div>
          {dataState.error && (
            <p className={`sm:col-span-2 ${errCls}`}>{dataState.error}</p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={dataPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {dataPending ? t.saving : t.saveChanges}
            </button>
          </div>
        </form>
      </section>

      {/* ==== Ganti password ==== */}
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-emerald-950">
          <KeyRound className="h-4 w-4 text-emerald-600" /> {t.pwTitle}
        </h2>
        <form action={pwAction} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="passe_lama" className={labelCls}>
              {t.pwOld}
            </label>
            <input
              id="passe_lama"
              name="passe_lama"
              type="password"
              required
              autoComplete="current-password"
              value={pwLama}
              onChange={(e) => setPwLama(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="passe_baru" className={labelCls}>
              {t.pwNew}
            </label>
            <input
              id="passe_baru"
              name="passe_baru"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={pwBaru}
              onChange={(e) => setPwBaru(e.target.value)}
              aria-invalid={pwSama}
              className={inputCls}
            />
            {pwSama && (
              <p className="mt-1 text-xs font-medium text-red-600" data-testid="pw-same-error">
                {t.pwSame}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="passe_konfirmasi" className={labelCls}>
              {t.pwConfirm}
            </label>
            <input
              id="passe_konfirmasi"
              name="passe_konfirmasi"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={pwKonfirmasi}
              onChange={(e) => setPwKonfirmasi(e.target.value)}
              className={inputCls}
            />
          </div>
          {pwState.error && <p className={`sm:col-span-3 ${errCls}`}>{pwState.error}</p>}
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={pwPending || pwSama}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {pwPending ? t.saving : t.changePw}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
