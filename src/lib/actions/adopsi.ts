"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

export async function updateAdopsi(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Baris adopsi tidak ditemukan." };

  const nama = String(formData.get("nama") ?? "").trim();
  const certnum = String(formData.get("certnum") ?? "").trim();
  if (!nama) return { error: "Nama penerima wajib diisi." };

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editadopsi", {
      id,
      nama,
      certnum,
      dur: Number(formData.get("dur")) || 1,
      price: Number(formData.get("price")) || 0,
      methode: String(formData.get("methode") ?? "").trim(),
      tgl_adopt: String(formData.get("tgl_adopt") ?? ""),
      tgl_exp: String(formData.get("tgl_exp") ?? ""),
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan data adopsi." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan data adopsi." };
  }

  revalidatePath("/admin/adopsi");
  redirect("/admin/adopsi?saved=1");
}

export async function hapusAdopsi(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/adopsi?error=Baris+adopsi+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusadopsi", { id });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/adopsi?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus data adopsi.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/adopsi?error=Gagal+menghapus+data+adopsi");
  }

  revalidatePath("/admin/adopsi");
  redirect("/admin/adopsi?deleted=1");
}
