"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Gambar template lewat endpoint uploadcover yang sama — file disimpan di
// public/assets dan DB menyimpan filename polos (pola blog/slider).
async function uploadTemplateImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiPostForm<{ value?: string | number; pesan?: string; cover?: string }>(
    "uploadcover",
    fd,
  );
  if (Number(res.value) !== 200 || !res.cover) {
    throw new Error(res.pesan ?? "Gagal mengunggah gambar.");
  }
  return res.cover;
}

function bendera(formData: FormData, key: string): 1 | 0 {
  return formData.get(key) === "1" || formData.get(key) === "on" ? 1 : 0;
}

export async function createTemplate(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { error: "Nama template wajib diisi." };
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih gambar template terlebih dahulu." };
  }
  if (!file.type.startsWith("image/")) return { error: "Gambar harus berupa berkas gambar." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Ukuran gambar maksimal 2MB — ekspor sebagai JPG." };

  try {
    const gambar = await uploadTemplateImage(file);
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahtemplate", {
      nama,
      file: gambar,
      utama: bendera(formData, "utama"),
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah template." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah template." };
  }

  revalidatePath("/admin/template-sertifikat");
  redirect("/admin/template-sertifikat?created=1");
}

export async function updateTemplate(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Template tidak ditemukan." };
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { error: "Nama template wajib diisi." };
  const file = formData.get("gambar");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Gambar harus berupa berkas gambar." };
    if (file.size > MAX_IMAGE_BYTES) return { error: "Ukuran gambar maksimal 2MB — ekspor sebagai JPG." };
  }

  try {
    let gambar: string | undefined;
    if (file instanceof File && file.size > 0) {
      gambar = await uploadTemplateImage(file);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>("edittemplate", {
      id,
      nama,
      file: gambar,
      utama: bendera(formData, "utama"),
      aktif: bendera(formData, "aktif"),
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan template." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan template." };
  }

  revalidatePath("/admin/template-sertifikat");
  redirect("/admin/template-sertifikat?saved=1");
}

export async function deleteTemplate(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/template-sertifikat?error=Template+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapustemplate", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/template-sertifikat?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus template.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/template-sertifikat?error=Gagal+menghapus+template");
  }

  revalidatePath("/admin/template-sertifikat");
  redirect("/admin/template-sertifikat?deleted=1");
}
