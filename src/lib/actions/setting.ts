"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

// Kontak disimpan di Laravel (tabel kontak) — sumber tunggal bersama
// mobile. Footer web membacanya via getkontak dengan fallback settings
// lokal.
export async function updateKontak(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const nama = String(formData.get("nama") ?? "").trim();
  const telepon = String(formData.get("telepon") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!nama || !telepon || !whatsapp || !email) {
    return { error: "Semua field wajib diisi." };
  }

  let res: { value?: string | number; pesan?: string };
  try {
    res = await apiPost<{ value?: string | number; pesan?: string }>("updatekontak", {
      nama,
      telepon,
      whatsapp,
      email,
    });
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan kontak." };
  }
  if (Number(res.value) !== 200) {
    return { error: res.pesan ?? "Gagal menyimpan kontak." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/kontak");
  revalidatePath("/");
  return { saved: true };
}

// ===== Nomor WA admin (tabel kontak_admin via Laravel) — tampil di
// halaman checkout sebagai bantuan donatur =====

export async function addNoadmin(formData: FormData): Promise<void> {
  await requireAdminLevel();
  const nomer = String(formData.get("nomer") ?? "").trim();
  if (!nomer) redirect("/admin/pengaturan?waerror=" + encodeURIComponent("Nomor WA wajib diisi."));

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahnoadmin", { nomer });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pengaturan?waerror=${encodeURIComponent(res.pesan ?? "Gagal menambah nomor.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pengaturan?waerror=" + encodeURIComponent("Gagal menambah nomor."));
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/checkout");
  redirect("/admin/pengaturan?wasaved=" + encodeURIComponent("Nomor WA ditambahkan."));
}

export async function editNoadmin(formData: FormData): Promise<void> {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const nomer = String(formData.get("nomer") ?? "").trim();
  if (!id || !nomer) redirect("/admin/pengaturan?waerror=" + encodeURIComponent("Nomor WA wajib diisi."));

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editnoadmin", { id, nomer });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pengaturan?waerror=${encodeURIComponent(res.pesan ?? "Gagal menyimpan nomor.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pengaturan?waerror=" + encodeURIComponent("Gagal menyimpan nomor."));
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/checkout");
  redirect("/admin/pengaturan?wasaved=" + encodeURIComponent("Nomor WA diperbarui."));
}

export async function deleteNoadmin(formData: FormData): Promise<void> {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/pengaturan?waerror=" + encodeURIComponent("Nomor tidak ditemukan."));

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusnoadmin", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pengaturan?waerror=${encodeURIComponent(res.pesan ?? "Gagal menghapus nomor.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pengaturan?waerror=" + encodeURIComponent("Gagal menghapus nomor."));
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/checkout");
  redirect("/admin/pengaturan?wasaved=" + encodeURIComponent("Nomor WA dihapus."));
}
