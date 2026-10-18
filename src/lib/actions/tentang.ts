"use server";

import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

type LangkahPayload = { id?: number; judul: string; isi: string; aktif: number };

// Konten halaman "Tentang Pohon Asuh" disimpan di Laravel (tabel tentang +
// tentang_langkah). Daftar langkah dikirim sebagai string JSON karena
// apiPost hanya menerima nilai skalar.
export async function simpanTentang(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const judul = String(formData.get("judul") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  const mekanisme = String(formData.get("mekanisme") ?? "").trim();

  let langkah: LangkahPayload[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("langkah") ?? "[]"));
    if (Array.isArray(parsed)) langkah = parsed;
  } catch {
    langkah = [];
  }

  if (!judul) return { error: "Judul wajib diisi." };

  const terisi = langkah.filter((l) => l.judul.trim() !== "" || l.isi.trim() !== "");
  if (terisi.some((l) => l.judul.trim() === "" || l.isi.trim() === "")) {
    return { error: "Setiap langkah wajib punya judul dan isi — lengkapi atau hapus barisnya." };
  }
  const payload: LangkahPayload[] = terisi.map((l) => ({
    ...(l.id ? { id: l.id } : {}),
    judul: l.judul.trim(),
    isi: l.isi.trim(),
    aktif: l.aktif === 0 ? 0 : 1,
  }));

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("simpantentang", {
      judul,
      deskripsi,
      mekanisme,
      langkah: JSON.stringify(payload),
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan konten." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan konten." };
  }

  revalidatePath("/tentang");
  revalidatePath("/admin/tentang");
  return { saved: true };
}
