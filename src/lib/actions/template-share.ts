"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const BASE = "/admin/template-share";

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

// Petugas (level 2) mengirim idpetugas agar backend menegakkan kepemilikan
// desa — admin (level 1) tidak.
async function scopePetugas(): Promise<number | null> {
  const session = await requireAdmin();
  return (session.level ?? 1) === 2 ? session.userId : null;
}

export async function createTemplateShare(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const idpetugas = await scopePetugas();

  const desa = String(formData.get("desa") ?? "").trim();
  if (!desa) return { error: "Desa wajib dipilih." };
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
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahtemplateshare", {
      desa,
      nama,
      file: gambar,
      utama: bendera(formData, "utama"),
      ...(idpetugas ? { idpetugas } : {}),
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah template." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah template." };
  }

  revalidatePath(BASE);
  redirect(`${BASE}?created=1`);
}

export async function updateTemplateShare(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const idpetugas = await scopePetugas();

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
    const res = await apiPost<{ value?: string | number; pesan?: string }>("edittemplateshare", {
      id,
      nama,
      file: gambar,
      utama: bendera(formData, "utama"),
      aktif: bendera(formData, "aktif"),
      ...(idpetugas ? { idpetugas } : {}),
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan template." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan template." };
  }

  revalidatePath(BASE);
  redirect(`${BASE}?saved=1`);
}

export async function deleteTemplateShare(formData: FormData) {
  const idpetugas = await scopePetugas();
  const id = Number(formData.get("id"));
  if (!id) redirect(`${BASE}?error=Template+tidak+ditemukan`);

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapustemplateshare", {
      id,
      ...(idpetugas ? { idpetugas } : {}),
    });
    if (Number(res.value) !== 200) {
      redirect(`${BASE}?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus template.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`${BASE}?error=Gagal+menghapus+template`);
  }

  revalidatePath(BASE);
  redirect(`${BASE}?deleted=1`);
}
