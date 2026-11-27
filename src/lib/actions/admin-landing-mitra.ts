"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";

const adminHeaders = () => ({ "X-Admin-Key": process.env.ADMIN_API_KEY ?? "" });
const back = (param: string) => `/admin/landing-mitra?${param}=1`;

export async function uploadHeroMitra(formData: FormData) {
  await requireAdminLevel();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) redirect(back("error"));

  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await apiPostForm<{ value?: string | number; pesan?: string }>(
      "uploadmitrahero",
      fd,
      adminHeaders(),
    );
    if (Number(res.value) !== 200) redirect(back("error"));
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(back("error"));
  }
  revalidatePath("/admin/landing-mitra");
  revalidatePath("/kerjasama-mitra");
  redirect(back("uploaded"));
}

export async function tambahFaqMitra(formData: FormData) {
  await requireAdminLevel();
  const pertanyaanId = String(formData.get("pertanyaan_id") ?? "").trim();
  const jawabanId = String(formData.get("jawaban_id") ?? "").trim();
  if (!pertanyaanId || !jawabanId) redirect(back("error"));
  try {
    const res = await apiPost<{ value?: string | number }>(
      "tambahmitrafb",
      {
        pertanyaan_id: pertanyaanId,
        jawaban_id: jawabanId,
        pertanyaan_en: String(formData.get("pertanyaan_en") ?? "").trim(),
        jawaban_en: String(formData.get("jawaban_en") ?? "").trim(),
        urutan: Number(formData.get("urutan") ?? 0),
      },
      adminHeaders(),
    );
    if (Number(res.value) !== 200) redirect(back("error"));
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(back("error"));
  }
  revalidatePath("/admin/landing-mitra");
  revalidatePath("/kerjasama-mitra");
  redirect(back("saved"));
}

export async function editFaqMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect(back("error"));
  try {
    const res = await apiPost<{ value?: string | number }>(
      "editmitrafb",
      {
        id,
        pertanyaan_id: String(formData.get("pertanyaan_id") ?? "").trim(),
        jawaban_id: String(formData.get("jawaban_id") ?? "").trim(),
        pertanyaan_en: String(formData.get("pertanyaan_en") ?? "").trim(),
        jawaban_en: String(formData.get("jawaban_en") ?? "").trim(),
        urutan: Number(formData.get("urutan") ?? 0),
      },
      adminHeaders(),
    );
    if (Number(res.value) !== 200) redirect(back("error"));
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(back("error"));
  }
  revalidatePath("/admin/landing-mitra");
  revalidatePath("/kerjasama-mitra");
  redirect(back("saved"));
}

export async function hapusFaqMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect(back("error"));
  try {
    const res = await apiPost<{ value?: string | number }>(
      "hapusmitrafb",
      { id },
      adminHeaders(),
    );
    if (Number(res.value) !== 200) redirect(back("error"));
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(back("error"));
  }
  revalidatePath("/admin/landing-mitra");
  revalidatePath("/kerjasama-mitra");
  redirect(back("deleted"));
}
