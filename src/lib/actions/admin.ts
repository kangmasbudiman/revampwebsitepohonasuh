"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";

export type AdminState = { error?: string; saved?: boolean };

// id = id confirmation (ordercustomer mengembalikannya sebagai confirmasiid).
// verivication Laravel sekaligus menerbitkan certnum semua pohon pada
// invoice dan mengirim notifikasi ke donatur.
export async function verifyAdoption(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireAdminLevel();

  const confirmasiId = Number(formData.get("confirmasiId"));
  if (!confirmasiId) return { error: "Order tidak ditemukan." };

  try {
    await apiPost("verivication", { id: confirmasiId, iduser: session.userId });
  } catch {
    return { error: "Gagal memverifikasi pembayaran. Coba lagi." };
  }

  revalidatePath("/admin/verifikasi");
  revalidatePath("/admin");
  revalidatePath("/keuangan");
  revalidatePath("/pohon");
  revalidatePath("/dashboard");
  redirect("/admin/verifikasi?verified=1");
}

// Tolak = batalkan verifikasi: order dibatalkan, pohon dikembalikan ke
// available, donatur dinotifikasi (pola batalverivication).
export async function rejectAdoption(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireAdminLevel();

  const confirmasiId = Number(formData.get("confirmasiId"));
  if (!confirmasiId) return { error: "Order tidak ditemukan." };

  try {
    await apiPost("batalverivication", { id: confirmasiId, iduser: session.userId });
  } catch {
    return { error: "Gagal menolak pembayaran. Coba lagi." };
  }

  revalidatePath("/admin/verifikasi");
  revalidatePath("/admin");
  revalidatePath("/pohon");
  revalidatePath("/dashboard");
  redirect("/admin/verifikasi?rejected=1");
}

export async function createTree(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const idpohon = String(formData.get("idpohon") ?? "").trim().toUpperCase();
  const localName = String(formData.get("localName") ?? "").trim();
  const desa = String(formData.get("desa") ?? "").trim();
  const harga = Number(formData.get("priceIdr"));

  if (!idpohon || !localName || !desa || !harga) {
    return { error: "Kode pohon, nama lokal, desa, dan harga wajib diisi." };
  }
  if (Number.isNaN(harga) || harga < 10000) {
    return { error: "Harga adopsi minimal Rp10.000." };
  }

  const diameter = Number(formData.get("diameterCm"));
  const heightM = Number(formData.get("heightM"));
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();

  let res: { value?: string | number; pesan?: string };
  try {
    res = await apiPost<{ value?: string | number; pesan?: string }>("tambahpohon", {
      idpohon,
      localname: localName,
      species: String(formData.get("species") ?? "").trim(),
      desa,
      harga,
      diameter: Number.isNaN(diameter) || !diameter ? 0 : diameter,
      tinggi: Number.isNaN(heightM) || !heightM ? 0 : heightM,
      foto_pohon: photoUrl,
    });
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah pohon." };
  }
  if (Number(res.value) !== 200) {
    return { error: res.pesan ?? "Gagal menambah pohon." };
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  return {};
}

export async function createExpense(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const title = String(formData.get("title") ?? "").trim();
  const amountIdr = Number(formData.get("amountIdr"));
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const spentAt = String(formData.get("spentAt") ?? "");

  if (!title || !amountIdr) return { error: "Uraian dan jumlah wajib diisi." };
  if (Number.isNaN(amountIdr) || amountIdr <= 0) return { error: "Jumlah tidak valid." };

  await db.expense.create({
    data: {
      title,
      amountIdr,
      category: category || null,
      description: description || null,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
    },
  });

  revalidatePath("/admin/keuangan");
  revalidatePath("/keuangan");
  return {};
}

export async function deleteExpense(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  await db.expense.delete({ where: { id } });
  revalidatePath("/admin/keuangan");
  revalidatePath("/keuangan");
}
