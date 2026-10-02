"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";

export type PesanRow = {
  id: number;
  pesan: string;
  status: string;
  tanggal: string | null;
};

// Endpoint mypesanupdate/mypesandelete TIDAK memverifikasi kepemilikan di
// backend — id boleh pesan member mana pun. Server action wajib memastikan
// pesan benar milik member yang login sebelum meneruskan ke API.
async function pesanMilikSendiri(sessionUserId: number, id: number) {
  try {
    const rows = await apiPost<Record<string, unknown>[]>("listPesanku", {
      idmember: sessionUserId,
    });
    return Array.isArray(rows) && rows.some((r) => Number(r.id) === id);
  } catch {
    return false;
  }
}

// Jumlah pesan belum dibaca (badge lonceng). userId diambil dari sesi
// login — bukan parameter client — agar tiap akun hanya bisa membaca
// pesannya sendiri.
export async function getUnreadPesan(): Promise<number> {
  const session = await requireUser();
  try {
    const res = await apiPost<{ value?: string; jumlah?: number | string }>("getPesanku", {
      idmember: session.userId,
    });
    return Number(res.jumlah) || 0;
  } catch {
    return 0;
  }
}

// Daftar pesan terbaru utk dropdown notifikasi. Endpoint mengembalikan
// urutan insert — sort desc by id di sini.
export async function listPesan(): Promise<PesanRow[]> {
  const session = await requireUser();
  try {
    const rows = await apiPost<Record<string, unknown>[]>("listPesanku", {
      idmember: session.userId,
    });
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({
        id: Number(r.id),
        pesan: String(r.pesan ?? ""),
        status: String(r.status ?? ""),
        tanggal: r.tanggal ? String(r.tanggal) : null,
      }))
      .sort((a, b) => b.id - a.id);
  } catch {
    return [];
  }
}

// Tandai pesan dibaca. mypesanupdate membalas body KOSONG → res.json()
// di apiPost melempar; anggap sukses.
export async function markPesanRead(id: number): Promise<boolean> {
  const session = await requireUser();
  if (!(await pesanMilikSendiri(session.userId, id))) return false;
  try {
    await apiPost("mypesanupdate", { id });
  } catch {
    // respons kosong dari backend — pesan tetap dianggap terbaca
  }
  revalidatePath("/dashboard/notifikasi");
  return true;
}

// Hapus pesan milik member yang login.
export async function hapusPesan(id: number): Promise<boolean> {
  const session = await requireUser();
  if (!(await pesanMilikSendiri(session.userId, id))) return false;
  try {
    await apiPost("mypesandelete", { id });
  } catch {
    return false;
  }
  revalidatePath("/dashboard/notifikasi");
  return true;
}

// Hapus SEMUA pesan member yang login. Id diambil dari listPesanku milik
// sesi sendiri (kepemilikan inheren), lalu dihapus satu per satu — backend
// tidak menyediakan endpoint bulk.
export async function hapusSemuaPesan(): Promise<number> {
  const session = await requireUser();
  let ids: number[] = [];
  try {
    const rows = await apiPost<Record<string, unknown>[]>("listPesanku", {
      idmember: session.userId,
    });
    if (Array.isArray(rows)) {
      ids = rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
    }
  } catch {
    return 0;
  }
  let terhapus = 0;
  for (const id of ids) {
    try {
      await apiPost("mypesandelete", { id });
      terhapus++;
    } catch {
      // lanjutkan sisa daftar
    }
  }
  revalidatePath("/dashboard/notifikasi");
  return terhapus;
}
