"use server";

import { apiPost } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { revalidatePath } from "next/cache";

export type MemoState = { ok?: boolean; error?: string };

// Pesan "Message and Impression" sertifikat — hanya pemilik adopsi.
export async function simpanMemoSertifikat(
  _prev: MemoState,
  fd: FormData,
): Promise<MemoState> {
  const session = await requireUser();
  const certnum = String(fd.get("certnum") ?? "").trim();
  const memo = String(fd.get("memo") ?? "").slice(0, 255);
  if (!certnum) return { error: "Nomor sertifikat tidak valid." };
  try {
    const res = await apiPost<{ value?: string; pesan?: string }>(
      "updatememosertifikat",
      { certnum, memo, id: session.userId },
    );
    if (res.value !== "200") return { error: res.pesan ?? "Gagal menyimpan pesan." };
  } catch {
    return { error: "Gagal menyimpan pesan — coba lagi." };
  }
  // certnum mengandung '/' (route catch-all) — path literal, tanpa encode.
  revalidatePath(`/sertifikat/${certnum}`);
  return { ok: true };
}
