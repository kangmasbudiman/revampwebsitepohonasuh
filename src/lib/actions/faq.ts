"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { requireAdminLevel } from "@/lib/guard";
import type { AdminState } from "@/lib/actions/admin";

const bersihkan = (fd: FormData) => {
  const question = String(fd.get("question") ?? "").trim();
  const answer = String(fd.get("answer") ?? "").trim();
  const sortOrder = Number(fd.get("sortOrder"));
  const aktif = fd.get("aktif") === "on" || fd.get("aktif") === "true";
  return { question, answer, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0, aktif };
};

const segarkan = () => {
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  revalidatePath("/tentang");
};

export async function createFaq(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();
  const { question, answer, sortOrder, aktif } = bersihkan(formData);
  if (!question || !answer) return { error: "Pertanyaan dan jawaban wajib diisi." };

  await db.faq.create({ data: { question, answer, sortOrder, aktif } });
  segarkan();
  return { saved: true };
}

export async function updateFaq(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const { question, answer, sortOrder, aktif } = bersihkan(formData);
  if (!id) return { error: "FAQ tidak ditemukan." };
  if (!question || !answer) return { error: "Pertanyaan dan jawaban wajib diisi." };

  await db.faq.update({ where: { id }, data: { question, answer, sortOrder, aktif } });
  segarkan();
  return { saved: true };
}

export async function deleteFaq(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  await db.faq.delete({ where: { id } });
  segarkan();
}

export async function toggleFaq(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const faq = await db.faq.findUnique({ where: { id } });
  if (faq) {
    await db.faq.update({ where: { id }, data: { aktif: !faq.aktif } });
    segarkan();
  }
}
