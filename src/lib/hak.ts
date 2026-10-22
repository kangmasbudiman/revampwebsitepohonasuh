import type { Session } from "@/lib/auth";

// Daftar izin yang dikenal — selalu selaras dengan izinValid() di backend
// (restApiPohonasuh ApiController). Izin baru ditambah di kedua tempat.
export const IZIN = [{ id: "memo", label: "Terbit Memo & Pencairan" }] as const;

export type IzinId = (typeof IZIN)[number]["id"];

export const IZIN_IDS: string[] = IZIN.map((i) => i.id);

// Izin murni dari role member di session — TIDAK ada bypass level admin:
// memo wajib role ber-izin, dan backend menegaskan segar dari DB saat simpan.
export function punyaHak(session: Session | null, izin: IzinId | string): boolean {
  if (!session) return false;
  return Array.isArray(session.hak) && session.hak.includes(izin);
}

export const bolehMemo = (session: Session | null) => punyaHak(session, "memo");
