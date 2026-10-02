"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Gambar slider lewat endpoint uploadcover yang sama — file disimpan di
// public/assets dan DB slider menyimpan filename polos (pola reader lama).
async function uploadSliderImage(file: File): Promise<string> {
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

function validateSlider(formData: FormData): { error?: string } {
  const judul = String(formData.get("judul") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  if (!judul || !deskripsi) return { error: "Judul dan deskripsi wajib diisi." };
  const file = formData.get("gambar");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Gambar harus berupa berkas gambar." };
    if (file.size > MAX_IMAGE_BYTES) return { error: "Ukuran gambar maksimal 2MB." };
  }
  return {};
}

export async function createSlider(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const invalid = validateSlider(formData);
  if (invalid.error) return invalid;

  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih gambar slide terlebih dahulu." };
  }

  try {
    const gambar = await uploadSliderImage(file);
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahslider", {
      judul: String(formData.get("judul") ?? "").trim(),
      deskripsi: String(formData.get("deskripsi") ?? "").trim(),
      gambar,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah slide." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah slide." };
  }

  revalidatePath("/admin/slider");
  revalidatePath("/");
  return { saved: true };
}

export async function updateSlider(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Slide tidak ditemukan." };

  const invalid = validateSlider(formData);
  if (invalid.error) return invalid;

  const file = formData.get("gambar");
  let gambar: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      gambar = await uploadSliderImage(file);
    }
    // Tanpa file baru, field gambar tidak dikirim — editslider mempertahankan
    // gambar lama.
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editslider", {
      id,
      judul: String(formData.get("judul") ?? "").trim(),
      deskripsi: String(formData.get("deskripsi") ?? "").trim(),
      gambar,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan slide." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan slide." };
  }

  revalidatePath("/admin/slider");
  revalidatePath("/");
  redirect("/admin/slider?saved=1");
}

export async function deleteSlider(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/slider?error=Slide+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusslider", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/slider?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus slide.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/slider?error=Gagal+menghapus+slide");
  }

  revalidatePath("/admin/slider");
  revalidatePath("/");
  redirect("/admin/slider?deleted=1");
}
