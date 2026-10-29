"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { apiPost } from "@/lib/api";

export type AuthState = {
  error?: string;
  success?: boolean;
  emaile?: string;
  unverified?: boolean;
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

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };

  const res = await masuk(email, password);
  if (res && String(res.value) === "201") {
    return {
      unverified: true,
      emaile: email.toLowerCase(),
      error: res.pesan ?? "Email belum diverifikasi. Silakan cek email Anda.",
    };
  }
  if (!res || String(res.value) !== "200" || !res.id) {
    return { error: "Email atau kata sandi salah." };
  }

  const admin = Number(res.admin) || 0;
  await createSession({
    userId: Number(res.id),
    name: String(res.name ?? ""),
    role: admin >= 1 ? "ADMIN" : "DONOR",
    level: admin >= 1 ? admin : undefined,
    hak: admin >= 1 && Array.isArray(res.hak) ? res.hak : undefined,
    photo: res.foto || null,
  });
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(admin === 2 ? "/admin/tagging" : admin >= 1 ? "/admin" : "/dashboard");
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
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  if (password.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (password !== konfirmasi) return { error: "Konfirmasi kata sandi tidak sama." };

  let res: { value?: string | number; pesan?: string };
  try {
    res = await apiPost<{ value?: string | number; pesan?: string }>("resetpassword", {
      token,
      passe: password,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi sebentar." };
  }
  if (String(res.value) !== "1") return { error: res.pesan ?? "Token tidak valid." };
  return { success: true };
}

export async function logout() {
  await destroySession();
  redirect("/");
}
