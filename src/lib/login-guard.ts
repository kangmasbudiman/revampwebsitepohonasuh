import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pa_login_guard";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const MAX_ATTEMPTS = 3;
const LOCK_MS = 5 * 60 * 1000;
const MAX_AGE = 10 * 60;

type Guard = { attempts: number; lockedUntil: number };

async function read(): Promise<Guard> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return { attempts: 0, lockedUntil: 0 };
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      attempts: typeof payload.attempts === "number" ? payload.attempts : 0,
      lockedUntil: typeof payload.lockedUntil === "number" ? payload.lockedUntil : 0,
    };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

async function write(g: Guard) {
  const token = await new SignJWT(g)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Sisa penguncian dalam milidetik (0 = tidak terkunci). */
export async function lockRemaining(): Promise<number> {
  const g = await read();
  if (!g.lockedUntil || g.lockedUntil <= Date.now()) return 0;
  return g.lockedUntil - Date.now();
}

export async function recordFailure(): Promise<{ locked: boolean; remaining: number }> {
  const sisa = await lockRemaining();
  if (sisa > 0) return { locked: true, remaining: sisa };

  const g = await read();
  g.attempts += 1;
  g.lockedUntil = 0;
  if (g.attempts >= MAX_ATTEMPTS) {
    g.attempts = 0;
    g.lockedUntil = Date.now() + LOCK_MS;
  }
  await write(g);
  return {
    locked: g.lockedUntil > 0,
    remaining: g.lockedUntil > 0 ? g.lockedUntil - Date.now() : 0,
  };
}

export async function clearGuard() {
  (await cookies()).delete(COOKIE_NAME);
}

export function formatLockMessage(remainingMs: number): string {
  const menit = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Terlalu banyak percobaan login. Silakan coba lagi dalam ${menit} menit.`;
}
