"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";

const adminHeaders = () => ({ "X-Admin-Key": process.env.ADMIN_API_KEY ?? "" });

export async function uploadTaggingTemplateDesign(formData: FormData) {
  await requireAdminLevel();
  const file = formData.get("image");
  const nama = String(formData.get("nama") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/desain-tagging?error=File+gambar+wajib+diisi");
  }

  const fd = new FormData();
  fd.append("image", file);
  fd.append("nama", nama);

  try {
    const res = await apiPostForm<{ value?: string | number; pesan?: string }>(
      "uploadtaggingtemplate",
      fd,
      adminHeaders(),
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/desain-tagging?error=${encodeURIComponent(res.pesan ?? "Gagal mengunggah desain.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/desain-tagging?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/desain-tagging");
  redirect("/admin/desain-tagging?uploaded=1");
}

export async function aktifkanTaggingTemplateDesign(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/desain-tagging?error=Desain+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "aktifkantaggingtemplate",
      { id },
      adminHeaders(),
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/desain-tagging?error=${encodeURIComponent(res.pesan ?? "Gagal mengaktifkan desain.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/desain-tagging?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/desain-tagging");
  revalidatePath("/admin/tagging");
  revalidatePath("/sertifikat");
  redirect("/admin/desain-tagging?activated=1");
}

export async function hapusTaggingTemplateDesign(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/desain-tagging?error=Desain+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "hapustaggingtemplate",
      { id },
      adminHeaders(),
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/desain-tagging?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus desain.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/desain-tagging?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/desain-tagging");
  revalidatePath("/admin/tagging");
  revalidatePath("/sertifikat");
  redirect("/admin/desain-tagging?deleted=1");
}
