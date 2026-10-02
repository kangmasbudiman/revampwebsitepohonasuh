"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// Logo partner diupload terpisah (uploadcover → filename) lalu filename
// disimpan di kolom partner.logo (pola sama dengan blog/slider).
async function uploadLogo(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiPostForm<{ value?: string | number; pesan?: string; cover?: string }>(
    "uploadcover",
    fd,
  );
  if (Number(res.value) !== 200 || !res.cover) {
    throw new Error(res.pesan ?? "Gagal mengunggah logo.");
  }
  return res.cover;
}

// ===================== Testimoni =====================

export async function saveTestimoni(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id")) || 0;
  const nama = String(formData.get("nama") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  if (!nama || !isi) return { error: "Nama dan isi testimoni wajib diisi." };

  const payload = {
    id: id || undefined,
    nama,
    isi,
    peran: String(formData.get("peran") ?? "").trim(),
    urutan: String(formData.get("urutan") ?? "").trim(),
  };

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      id ? "edittestimoni" : "tambahtestimoni",
      payload,
    );
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan testimoni." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan testimoni." };
  }

  revalidatePath("/admin/testimoni");
  revalidatePath("/");
  if (id) redirect("/admin/testimoni?saved=1");
  return { saved: true };
}

export async function deleteTestimoni(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/testimoni?error=Testimoni+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapustestimoni", {
      id,
    });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/testimoni?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus testimoni.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/testimoni?error=Gagal+menghapus+testimoni");
  }

  revalidatePath("/admin/testimoni");
  revalidatePath("/");
  redirect("/admin/testimoni?deleted=1");
}

// ===================== Partner =====================

export async function savePartner(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id")) || 0;
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { error: "Nama partner wajib diisi." };

  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Logo harus berupa gambar." };
    if (file.size > MAX_LOGO_BYTES) return { error: "Ukuran logo maksimal 2MB." };
  }

  let logo: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      logo = await uploadLogo(file);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      id ? "editpartner" : "tambahpartner",
      {
        id: id || undefined,
        nama,
        url: String(formData.get("url") ?? "").trim(),
        urutan: String(formData.get("urutan") ?? "").trim(),
        logo,
      },
    );
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan partner." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan partner." };
  }

  revalidatePath("/admin/testimoni");
  revalidatePath("/");
  if (id) redirect("/admin/testimoni?saved=1");
  return { saved: true };
}

export async function deletePartner(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/testimoni?error=Partner+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuspartner", {
      id,
    });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/testimoni?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus partner.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/testimoni?error=Gagal+menghapus+partner");
  }

  revalidatePath("/admin/testimoni");
  revalidatePath("/");
  redirect("/admin/testimoni?deleted=1");
}
