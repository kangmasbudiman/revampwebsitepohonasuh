"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { apiPost } from "@/lib/api";

export type AuthState = { error?: string };

// loginuser Laravel memakai satu field untuk email ATAU no HP dan
// mengembalikan value sebagai string "200".
type LoginResponse = {
  value?: string | number;
  email?: string;
  name?: string;
  id?: string | number;
  admin?: string | number;
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

  let res: { value?: string | number };
  try {
    res = await apiPost<{ value?: string | number }>("register", {
      name,
      emaile: email,
      hp: phone,
      passe: password,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi sebentar." };
  }
  if (Number(res.value) !== 1) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }

  const login = await masuk(email, password);
  if (!login || String(login.value) !== "200" || !login.id) {
    return { error: "Registrasi berhasil, tetapi gagal masuk otomatis. Silakan masuk." };
  }
  const admin = Number(login.admin) || 0;
  await createSession({
    userId: Number(login.id),
    name: String(login.name ?? name),
    role: admin >= 1 ? "ADMIN" : "DONOR",
    level: admin >= 1 ? admin : undefined,
    photo: login.foto || null,
  });
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(admin === 2 ? "/admin/tagging" : admin >= 1 ? "/admin" : "/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };

  const res = await masuk(email, password);
  if (!res || String(res.value) !== "200" || !res.id) {
    return { error: "Email atau kata sandi salah." };
  }

  const admin = Number(res.admin) || 0;
  await createSession({
    userId: Number(res.id),
    name: String(res.name ?? ""),
    role: admin >= 1 ? "ADMIN" : "DONOR",
    level: admin >= 1 ? admin : undefined,
    photo: res.foto || null,
  });
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(admin === 2 ? "/admin/tagging" : admin >= 1 ? "/admin" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
