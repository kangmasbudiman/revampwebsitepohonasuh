"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_FOTO_BYTES = 2 * 1024 * 1024;

// Foto diupload terpisah (uploadcover → filename polos) lalu filename
// disimpan di kolom cerita.foto — pola sama dengan blog/slider.
async function uploadFoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiPostForm<{ value?: string | number; pesan?: string; cover?: string }>(
    "uploadcover",
    fd,
  );
  if (Number(res.value) !== 200 || !res.cover) {
    throw new Error(res.pesan ?? "Gagal mengunggah foto.");
  }
  return res.cover;
}

function validateCerita(formData: FormData): { error?: string } {
  const judul = String(formData.get("judul") ?? "").trim();
  const narasumber = String(formData.get("narasumber") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  if (!judul || !narasumber || !isi) {
    return { error: "Judul, narasumber, dan isi cerita wajib diisi." };
  }
  const file = formData.get("foto");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Foto harus berupa gambar." };
    if (file.size > MAX_FOTO_BYTES) return { error: "Ukuran foto maksimal 2MB." };
  }
  return {};
}

export async function createCerita(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const invalid = validateCerita(formData);
  if (invalid.error) return invalid;

  const file = formData.get("foto");
  let foto: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      foto = await uploadFoto(file);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahcerita", {
      judul: String(formData.get("judul") ?? "").trim(),
      narasumber: String(formData.get("narasumber") ?? "").trim(),
      peran: String(formData.get("peran") ?? "").trim(),
      lokasi: String(formData.get("lokasi") ?? "").trim(),
      isi: String(formData.get("isi") ?? "").trim(),
      foto,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah cerita." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah cerita." };
  }

  revalidatePath("/admin/cerita");
  revalidatePath("/cerita-dampak");
  return { saved: true };
}

export async function updateCerita(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Cerita tidak ditemukan." };

  const invalid = validateCerita(formData);
  if (invalid.error) return invalid;

  const file = formData.get("foto");
  let foto: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      foto = await uploadFoto(file);
    }
    // Tanpa file baru field foto tidak dikirim — editcerita hanya
    // memperbarui field terisi sehingga foto lama dipertahankan.
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editcerita", {
      id,
      judul: String(formData.get("judul") ?? "").trim(),
      narasumber: String(formData.get("narasumber") ?? "").trim(),
      peran: String(formData.get("peran") ?? "").trim(),
      lokasi: String(formData.get("lokasi") ?? "").trim(),
      isi: String(formData.get("isi") ?? "").trim(),
      foto,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan cerita." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan cerita." };
  }

  revalidatePath("/admin/cerita");
  revalidatePath("/cerita-dampak");
  revalidatePath(`/cerita-dampak/${id}`);
  redirect("/admin/cerita?saved=1");
}

export async function deleteCerita(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/cerita?error=Cerita+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuscerita", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/cerita?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus cerita.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/cerita?error=Gagal+menghapus+cerita");
  }

  revalidatePath("/admin/cerita");
  revalidatePath("/cerita-dampak");
  redirect("/admin/cerita?deleted=1");
}
