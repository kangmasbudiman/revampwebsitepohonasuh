import { headers } from "next/headers";

/** URL absolut situs (mis. utk tautan di email/WA yang keluar dari app).
 *  Baca host/proto dari header request agar benar di balik proxy VPS;
 *  SITE_URL env dipakai bila keduanya tidak tersedia. */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}${path.startsWith("/") ? path : "/" + path}`;
  }
  const base = process.env.SITE_URL?.replace(/\/$/, "");
  return `${base ?? "http://localhost:3000"}${path.startsWith("/") ? path : "/" + path}`;
}
