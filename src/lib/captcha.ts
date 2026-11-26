import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pa_captcha";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I
const MAX_AGE = 5 * 60;

// Captcha lokal: jawaban hanya disimpan di cookie bertanda tangan (httpOnly).
// Teks yang ditampilkan ke user dikirim terpisah dari endpoint /api/captcha.
export async function issueCaptcha(): Promise<string> {
  const answer = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  const token = await new SignJWT({ answer })
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
  return answer;
}

// Dipakai sekali per submission — cookie dihapus apa pun hasilnya.
export async function verifyCaptcha(input: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  store.delete(COOKIE_NAME);
  try {
    const { payload } = await jwtVerify(token, secret);
    const answer = typeof payload.answer === "string" ? payload.answer : "";
    return answer.length > 0 && answer.toLowerCase() === input.trim().toLowerCase();
  } catch {
    return false;
  }
}
