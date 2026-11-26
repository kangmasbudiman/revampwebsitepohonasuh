"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  createPending2fa,
  getPending2fa,
  clearPending2fa,
} from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { issueCaptcha, verifyCaptcha } from "@/lib/captcha";
import { clearGuard, formatLockMessage, lockRemaining, recordFailure } from "@/lib/login-guard";

export type AuthState = {
  error?: string;
  success?: boolean;
  emaile?: string;
  unverified?: boolean;
  captcha?: string;
  twoFactor?: boolean;
  otpSent?: boolean;
};

// loginuser Laravel memakai satu field untuk email ATAU no HP dan
// mengembalikan value sebagai string "200"; "201" = email belum diverifikasi.
type LoginResponse = {
  value?: string | number;
  pesan?: string;
  email?: string;
  name?: string;
  id?: string | number;
  admin?: string | number;
  hak?: string[];
  mitra_id?: string | number;
  foto?: string;
};

async function masuk(email: string, password: string): Promise<LoginResponse | null> {
  try {
    return await apiPost<LoginResponse>("loginuser", {
      emaile: email,
      passe: password,
    });
  } catch {
    return null;
  }
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!name || !email || !password) return { error: "Nama, email, dan kata sandi wajib diisi." };
  if (password.length < 6) return { error: "Kata sandi minimal 6 karakter." };

  let res: { value?: string | number; message?: string };
  try {
    res = await apiPost<{ value?: string | number; message?: string }>("register", {
      name,
      emaile: email,
      hp: phone,
      passe: password,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi sebentar." };
  }
  if (Number(res.value) !== 1) {
    // Pesan validasi backend (mis. domain email tanpa MX) diteruskan apa adanya.
    return { error: res.message ?? "Email sudah terdaftar. Silakan masuk." };
  }

  // Akun dibuat — wajib verifikasi email sebelum bisa masuk (tidak auto-login).
  return { success: true, emaile: email };
}

function redirectSetelahLogin(session: {
  role: string;
  level?: number;
  mitraId?: number;
}, next: string): never {
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  if (session.mitraId) redirect("/mitra");
  redirect(session.level === 2 ? "/admin/tagging" : (session.level ?? 0) >= 1 ? "/admin" : "/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const captchaInput = String(formData.get("captcha") ?? "").trim();

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi.", captcha: await issueCaptcha() };
  }

  const sisa = await lockRemaining();
  if (sisa > 0) {
    return { error: formatLockMessage(sisa), captcha: await issueCaptcha() };
  }

  if (!(await verifyCaptcha(captchaInput))) {
    const r = await recordFailure();
    return {
      error: r.locked ? formatLockMessage(r.remaining) : "Captcha salah. Periksa kembali teks pada gambar.",
      captcha: await issueCaptcha(),
    };
  }

  const res = await masuk(email, password);
  if (res && String(res.value) === "201") {
    return {
      unverified: true,
      emaile: email.toLowerCase(),
      error: res.pesan ?? "Email belum diverifikasi. Silakan cek email Anda.",
    };
  }
  if (!res || String(res.value) !== "200" || !res.id) {
    const r = await recordFailure();
    return {
      error: r.locked ? formatLockMessage(r.remaining) : "Email atau kata sandi salah.",
      captcha: await issueCaptcha(),
    };
  }

  const admin = Number(res.admin) || 0;
  const mitraId = res.mitra_id ? Number(res.mitra_id) : undefined;
  const session = {
    userId: Number(res.id),
    name: String(res.name ?? ""),
    role: admin >= 1 ? "ADMIN" : "DONOR",
    level: admin >= 1 ? admin : undefined,
    hak: Array.isArray(res.hak) ? res.hak : undefined,
    mitraId,
    photo: res.foto || null,
  };

  // Admin & akun mitra wajib melewati 2FA (OTP email). Donor cukup captcha.
  if (admin >= 1 || mitraId) {
    const emaile = String(res.email ?? email).trim().toLowerCase();
    try {
      const otp = await apiPost<{ value?: string | number; pesan?: string }>("kirimotplogin", { emaile });
      if (Number(otp.value) !== 1) {
        return { error: otp.pesan ?? "Gagal mengirim kode OTP.", captcha: await issueCaptcha() };
      }
    } catch {
      return { error: "Gagal menghubungi server saat mengirim kode OTP.", captcha: await issueCaptcha() };
    }
    await createPending2fa({ session, email: emaile, next });
    await clearGuard();
    return { twoFactor: true, emaile, otpSent: true };
  }

  await clearGuard();
  await createSession(session);
  redirectSetelahLogin(session, next);
}

export async function verify2fa(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const pending = await getPending2fa();
  if (!pending) {
    return { twoFactor: false, error: "Sesi verifikasi berakhir. Silakan masuk lagi." };
  }

  const mode = String(formData.get("mode") ?? "verify");
  if (mode === "resend") {
    try {
      const otp = await apiPost<{ value?: string | number; pesan?: string }>("kirimotplogin", {
        emaile: pending.email,
      });
      if (Number(otp.value) !== 1) {
        return { twoFactor: true, emaile: pending.email, error: otp.pesan ?? "Gagal mengirim ulang kode." };
      }
      return { twoFactor: true, emaile: pending.email, otpSent: true };
    } catch {
      return { twoFactor: true, emaile: pending.email, error: "Gagal menghubungi server. Coba lagi." };
    }
  }

  const kode = String(formData.get("kode") ?? "").trim();
  if (!/^\d{6}$/.test(kode)) {
    return { twoFactor: true, emaile: pending.email, error: "Kode OTP harus 6 angka." };
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("verifikasiotplogin", {
      emaile: pending.email,
      kode,
    });
    if (Number(res.value) !== 1) {
      return { twoFactor: true, emaile: pending.email, error: res.pesan ?? "Kode OTP salah atau kedaluwarsa." };
    }
  } catch {
    return { twoFactor: true, emaile: pending.email, error: "Gagal menghubungi server. Coba lagi." };
  }

  await clearPending2fa();
  await createSession(pending.session);
  redirectSetelahLogin(pending.session, pending.next);
}

export async function kirimUlangVerifikasi(
  email: string,
): Promise<{ ok: boolean; pesan: string }> {
  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "kirimulangverifikasi",
      { emaile: email },
    );
    return { ok: String(res.value) === "1", pesan: res.pesan ?? "" };
  } catch {
    return { ok: false, pesan: "Gagal menghubungi server. Coba lagi sebentar." };
  }
}

export async function lupaPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email wajib diisi." };
  try {
    await apiPost("lupapassword", { emaile: email });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi sebentar." };
  }
  // Respons selalu generik — tidak membocorkan email mana yang terdaftar.
  return { success: true, emaile: email };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const kode = String(formData.get("kode") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  if (!email) return { error: "Email wajib diisi." };
  if (!/^\d{6}$/.test(kode)) return { error: "Kode OTP harus 6 angka." };
  if (password.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (password !== konfirmasi) return { error: "Konfirmasi kata sandi tidak sama." };

  let res: { value?: string | number; pesan?: string };
  try {
    res = await apiPost<{ value?: string | number; pesan?: string }>("resetpassword", {
      emaile: email,
      kode,
      passe: password,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi sebentar." };
  }
  if (String(res.value) !== "1") return { error: res.pesan ?? "Kode tidak valid." };
  return { success: true };
}

export async function logout() {
  await destroySession();
  redirect("/");
}
