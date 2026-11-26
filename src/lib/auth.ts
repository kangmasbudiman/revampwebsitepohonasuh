import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

const COOKIE_NAME = "pa_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export type Pending2fa = { session: Session; email: string; next: string };
const PENDING_COOKIE = "pa_2fa_pending";

export type Session = {
  userId: number;
  name: string;
  role: string;
  /** 1 = admin, 2 = petugas. Session lama tanpa level diperlakukan sebagai admin. */
  level?: number;
  /** Izin dari role member (mis. ["memo"]); level 1 selalu boleh semua. */
  hak?: string[];
  /** ID mitra jika akun ini adalah akun mitra (self-service portal). */
  mitraId?: number;
  /** URL foto profil member (upload/profil di server API); kosong = avatar inisial. */
  photo?: string | null;
};

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Tiket sementara setelah kata sandi benar tapi OTP 2FA belum diverifikasi.
export async function createPending2fa(pending: Pending2fa) {
  const token = await new SignJWT(pending)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
  (await cookies()).set(PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 5 * 60,
  });
}

export async function getPending2fa(): Promise<Pending2fa | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const session = payload.session as Session | undefined;
    if (!session || typeof session.userId !== "number") return null;
    return {
      session,
      email: typeof payload.email === "string" ? payload.email : "",
      next: typeof payload.next === "string" ? payload.next : "",
    };
  } catch {
    return null;
  }
}

export async function clearPending2fa() {
  (await cookies()).delete(PENDING_COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "number" || typeof payload.name !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      userId: payload.userId,
      name: payload.name,
      role: payload.role,
      level: typeof payload.level === "number" ? payload.level : undefined,
      hak: Array.isArray(payload.hak) ? payload.hak.filter((h): h is string => typeof h === "string") : undefined,
      mitraId: typeof payload.mitraId === "number" ? payload.mitraId : undefined,
      photo: typeof payload.photo === "string" && payload.photo !== "" ? payload.photo : null,
    };
  } catch {
    return null;
  }
});

/** Perbarui sebagian field session (nama/foto) lalu re-sign cookie.
 *  getSession di-cache React per-request — setelah memanggil ini cukup
 *  revalidatePath("/", "layout"), jangan baca ulang getSession di request
 *  yang sama. */
export async function updateSession(patch: Partial<Omit<Session, "userId" | "role">>) {
  const current = await getSession();
  if (!current) return;
  await createSession({ ...current, ...patch });
}
