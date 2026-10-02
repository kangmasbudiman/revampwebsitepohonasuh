import { redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/auth";

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/masuk");
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}

/** Level 1 = admin penuh, 2 = petugas (hanya Order Tagging).
 *  Angka level bukan peringkat — petugas (2) tidak boleh melihat
 *  halaman admin (1). Session lama tanpa level dianggap admin. */
export async function requireAdminLevel(): Promise<Session> {
  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) redirect("/admin/tagging");
  return session;
}
