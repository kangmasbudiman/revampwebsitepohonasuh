"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

export async function tambahProvinsi(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama provinsi wajib diisi." };
  try {
    const res = await apiPost<{ value?: number; pesan?: string }>("tambahprovinsi", { name });
    if (Number(res.value) !== 200) return { error: res.pesan ?? "Gagal menambah provinsi." };
  } catch {
    return { error: "Gagal menambah provinsi." };
  }
  revalidatePath("/admin/provinsi");
  revalidatePath("/admin/program-mitra");
  revalidatePath("/mitra/program");
  redirect("/admin/provinsi?saved=1");
}

export async function editProvinsi(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Provinsi tidak ditemukan." };
  if (!name) return { error: "Nama provinsi wajib diisi." };
  try {
    const res = await apiPost<{ value?: number; pesan?: string }>("editprovinsi", { id, name });
    if (Number(res.value) !== 200) return { error: res.pesan ?? "Gagal menyimpan provinsi." };
  } catch {
    return { error: "Gagal menyimpan provinsi." };
  }
  revalidatePath("/admin/provinsi");
  revalidatePath("/admin/program-mitra");
  revalidatePath("/mitra/program");
  redirect("/admin/provinsi?saved=1");
}

export async function hapusProvinsi(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  try {
    const res = await apiPost<{ value?: number; pesan?: string }>("hapusprovinsi", { id });
    if (Number(res.value) === 200) {
      revalidatePath("/admin/provinsi");
      revalidatePath("/admin/program-mitra");
      revalidatePath("/mitra/program");
    }
  } catch {
    // gagal hapus — rute tetap tidak ada perubahan
  }
}
