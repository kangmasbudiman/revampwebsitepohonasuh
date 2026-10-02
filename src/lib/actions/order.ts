"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";

// Koreksi nama penerima & memo satu invoice (updatememo) — nama & memo
// dipakai pada sertifikat, jadi koreksi di sini langsung memperbaiki cetakan.
export async function updateOrderMemo(formData: FormData) {
  await requireAdminLevel();
  const invoice = String(formData.get("invoice") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const target = `/admin/order/${encodeURIComponent(invoice)}`;
  if (!invoice) redirect("/admin/sertifikat?error=Invoice+tidak+ditemukan");
  if (!nama) redirect(`${target}?error=Nama+penerima+wajib+diisi`);

  try {
    await apiPost("updatememo", { invoice, nama, memo });
  } catch {
    redirect(`${target}?error=Gagal+menyimpan+perubahan`);
  }

  revalidatePath(target);
  revalidatePath("/admin/sertifikat");
  redirect(`${target}?saved=1`);
}
