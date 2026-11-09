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

export type NamaHadiahState = { ok?: boolean; error?: string; terkunci?: boolean };

// Revisi nama penerima sertifikat oleh pengadopsi hadiah. Server memutuskan
// apakah nama tagging masih bisa ikut berubah (proses < 2) atau hanya nama
// sertifikat (sudah masuk antrian tagging).
export async function ubahNamaHadiah(
  _prev: NamaHadiahState,
  fd: FormData,
): Promise<NamaHadiahState> {
  const session = await requireUser();
  const certnum = String(fd.get("certnum") ?? "").trim();
  const nama = String(fd.get("nama") ?? "").trim().slice(0, 255);
  const kembali = String(fd.get("kembali") ?? "").trim();
  if (!certnum) return { error: "Nomor sertifikat tidak valid." };
  if (!nama) return { error: "Nama penerima wajib diisi." };

  let res: { value?: string | number; pesan?: string; terkunci?: boolean };
  try {
    res = await apiPost("updatenamahadiah", {
      certnum,
      nama,
      id: session.userId,
    });
  } catch {
    return { error: "Gagal menyimpan nama — coba lagi." };
  }
  if (String(res.value) !== "200") {
    return { error: res.pesan ?? "Gagal menyimpan nama." };
  }

  revalidatePath(`/sertifikat/${certnum}`);
  if (kembali) revalidatePath(kembali);
  return { ok: true, terkunci: !!res.terkunci };
}
