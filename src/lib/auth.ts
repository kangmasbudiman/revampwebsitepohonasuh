import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

const COOKIE_NAME = "pa_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export type Session = {
  userId: number;
  name: string;
  role: string;
  /** 1 = admin, 2 = petugas. Session lama tanpa level diperlakukan sebagai admin. */
  level?: number;
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
    };
  } catch {
    return null;
  }
});
