"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_FOTO_BYTES = 2 * 1024 * 1024;

// Foto diupload terpisah (uploadcover → filename) lalu filename disimpan
// di kolom species_catalog.foto (pola sama dengan blog).
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

function validateSpecies(formData: FormData): { error?: string } {
  const namaLatin = String(formData.get("nama_latin") ?? "").trim();
  if (!namaLatin) return { error: "Nama latin wajib diisi." };
  const karbonRaw = String(formData.get("serapan_karbon") ?? "").replace(",", ".").trim();
  if (karbonRaw !== "" && Number.isNaN(Number(karbonRaw))) {
    return { error: "Serapan karbon harus berupa angka." };
  }
  const file = formData.get("foto");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Foto harus berupa gambar." };
    if (file.size > MAX_FOTO_BYTES) return { error: "Ukuran foto maksimal 2MB." };
  }
  return {};
}

export async function createSpecies(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdminLevel();

  const invalid = validateSpecies(formData);
  if (invalid.error) return invalid;

  const file = formData.get("foto");
  let foto: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      foto = await uploadFoto(file);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahspecies", {
      nama_latin: String(formData.get("nama_latin") ?? "").trim(),
      nama_lokal: String(formData.get("nama_lokal") ?? "").trim(),
      famili: String(formData.get("famili") ?? "").trim(),
      deskripsi: String(formData.get("deskripsi") ?? "").trim(),
      serapan_karbon: String(formData.get("serapan_karbon") ?? "").replace(",", ".").trim(),
      species_key: String(formData.get("species_key") ?? "").trim(),
      foto,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah spesies." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah spesies." };
  }

  revalidatePath("/admin/spesies");
  revalidatePath("/spesies");
  return { saved: true };
}

export async function updateSpecies(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Spesies tidak ditemukan." };

  const invalid = validateSpecies(formData);
  if (invalid.error) return invalid;

  const file = formData.get("foto");
  let foto: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      foto = await uploadFoto(file);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editspecies", {
      id,
      nama_latin: String(formData.get("nama_latin") ?? "").trim(),
      nama_lokal: String(formData.get("nama_lokal") ?? "").trim(),
      famili: String(formData.get("famili") ?? "").trim(),
      deskripsi: String(formData.get("deskripsi") ?? "").trim(),
      serapan_karbon: String(formData.get("serapan_karbon") ?? "").replace(",", ".").trim(),
      species_key: String(formData.get("species_key") ?? "").trim(),
      foto,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan spesies." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan spesies." };
  }

  revalidatePath("/admin/spesies");
  revalidatePath("/spesies");
  revalidatePath(`/spesies/${id}`);
  redirect("/admin/spesies?saved=1");
}

export async function deleteSpecies(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/spesies?error=Spesies+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusspecies", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/spesies?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus spesies.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/spesies?error=Gagal+menghapus+spesies");
  }

  revalidatePath("/admin/spesies");
  revalidatePath("/spesies");
  redirect("/admin/spesies?deleted=1");
}
