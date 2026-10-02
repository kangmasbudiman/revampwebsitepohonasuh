"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

// Field teks opsional: kosong → null (ConvertEmptyStringsToNull sudah
// mengubah '' jadi null di Laravel; kirim apa adanya).
export async function tambahLokasi(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const nama = String(formData.get("nama") ?? "").trim().toLowerCase();
  if (!nama) return { error: "Nama desa wajib diisi." };

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahlokasi", {
      nama,
      label: String(formData.get("label") ?? "").trim(),
      kode_cert: String(formData.get("kode_cert") ?? "").trim(),
      kode_pohon: String(formData.get("kode_pohon") ?? "").trim(),
      kecamatan: String(formData.get("kecamatan") ?? "").trim(),
      kabupaten: String(formData.get("kabupaten") ?? "").trim(),
      provinsi: String(formData.get("provinsi") ?? "").trim(),
      skema: String(formData.get("skema") ?? "").trim(),
      latitude: String(formData.get("latitude") ?? "").trim(),
      longitude: String(formData.get("longitude") ?? "").trim(),
      profil: String(formData.get("profil") ?? "").trim(),
      foto: String(formData.get("foto") ?? "").trim(),
      aktif: formData.get("aktif") ? 1 : 0,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah lokasi." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah lokasi." };
  }

  revalidatePath("/admin/lokasi");
  revalidatePath("/lokasi");
  redirect("/admin/lokasi?saved=1");
}

export async function updateLokasi(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Lokasi tidak ditemukan." };

  const nama = String(formData.get("nama") ?? "").trim().toLowerCase();
  if (!nama) return { error: "Nama desa wajib diisi." };

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editlokasi", {
      id,
      nama,
      label: String(formData.get("label") ?? "").trim(),
      kode_cert: String(formData.get("kode_cert") ?? "").trim(),
      kode_pohon: String(formData.get("kode_pohon") ?? "").trim(),
      kecamatan: String(formData.get("kecamatan") ?? "").trim(),
      kabupaten: String(formData.get("kabupaten") ?? "").trim(),
      provinsi: String(formData.get("provinsi") ?? "").trim(),
      skema: String(formData.get("skema") ?? "").trim(),
      latitude: String(formData.get("latitude") ?? "").trim(),
      longitude: String(formData.get("longitude") ?? "").trim(),
      profil: String(formData.get("profil") ?? "").trim(),
      foto: String(formData.get("foto") ?? "").trim(),
      aktif: formData.get("aktif") ? 1 : 0,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan lokasi." };
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan lokasi." };
  }

  revalidatePath("/admin/lokasi");
  revalidatePath("/lokasi");
  redirect("/admin/lokasi?saved=1");
}

export async function toggleLokasiAktif(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const aktif = Number(formData.get("aktif")) === 1 ? 0 : 1;
  if (!id) redirect("/admin/lokasi?error=Lokasi+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editlokasi", {
      id,
      aktif,
    });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/lokasi?error=${encodeURIComponent(res.pesan ?? "Gagal mengubah status lokasi.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/lokasi?error=Gagal+mengubah+status+lokasi");
  }

  revalidatePath("/admin/lokasi");
  revalidatePath("/lokasi");
  redirect("/admin/lokasi?saved=1");
}

export async function hapusLokasi(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/lokasi?error=Lokasi+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuslokasi", { id });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/lokasi?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus lokasi.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/lokasi?error=Gagal+menghapus+lokasi");
  }

  revalidatePath("/admin/lokasi");
  revalidatePath("/lokasi");
  redirect("/admin/lokasi?deleted=1");
}
