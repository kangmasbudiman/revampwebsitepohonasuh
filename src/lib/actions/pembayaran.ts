"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

type ApiRes = { value?: string | number; pesan?: string };

function bacaForm(formData: FormData) {
  const jumlah = Number(formData.get("jumlah"));
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const penerima = String(formData.get("penerima") ?? "").trim();
  const metode = String(formData.get("metode") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  return { jumlah, tanggal, penerima, metode, catatan };
}

function validasi({ jumlah, tanggal }: { jumlah: number; tanggal: string }): string | null {
  if (!Number.isFinite(jumlah) || jumlah <= 0) return "Jumlah pembayaran wajib diisi (lebih dari 0).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return "Tanggal pembayaran tidak valid.";
  return null;
}

// Catat pembayaran pohon yang sudah ditagging. Penerima kosong = backend
// mengisi otomatis dari petugas yang ditugaskan di desa pohon tersebut.
export async function catatPembayaran(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireAdminLevel();
  const idadopsi = Number(formData.get("idadopsi"));
  if (!idadopsi) return { error: "Data adopsi tidak ditemukan." };

  const f = bacaForm(formData);
  const err = validasi(f);
  if (err) return { error: err };

  try {
    const res = await apiPost<ApiRes>("tambahpembayaran", {
      idadopsi,
      jumlah: f.jumlah,
      tanggal: f.tanggal,
      penerima: f.penerima,
      metode: f.metode,
      catatan: f.catatan,
      iduser: session.userId,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal mencatat pembayaran." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal mencatat pembayaran." };
  }

  revalidatePath("/admin/keuangan/pembayaran");
  return { saved: true };
}

export async function editPembayaran(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) return { error: "Pembayaran tidak ditemukan." };

  const f = bacaForm(formData);
  const err = validasi(f);
  if (err) return { error: err };

  try {
    const res = await apiPost<ApiRes>("editpembayaran", {
      id,
      jumlah: f.jumlah,
      tanggal: f.tanggal,
      penerima: f.penerima,
      metode: f.metode,
      catatan: f.catatan,
      iduser: session.userId,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan pembayaran." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan pembayaran." };
  }

  revalidatePath("/admin/keuangan/pembayaran");
  return { saved: true };
}

export async function deletePembayaran(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/keuangan/pembayaran?error=Pembayaran+tidak+ditemukan");

  try {
    const res = await apiPost<ApiRes>("hapuspembayaran", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/keuangan/pembayaran?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus pembayaran.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/keuangan/pembayaran?error=Gagal+menghapus+pembayaran");
  }

  revalidatePath("/admin/keuangan/pembayaran");
  redirect("/admin/keuangan/pembayaran?deleted=1");
}
