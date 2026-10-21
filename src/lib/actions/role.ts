"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostFormLax } from "@/lib/api";
import { IZIN_IDS } from "@/lib/hak";
import type { AdminState } from "@/lib/actions/admin";

const izinDari = (formData: FormData): string[] =>
  IZIN_IDS.filter((i) => formData.get(`izin_${i}`));

// Simpan role (buat baru bila tanpa id). Izin dikirim sebagai izin[] agar
// Laravel membacanya array (apiPost tidak mendukung nilai array).
export async function simpanRole(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id")) || null;
  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) return { error: "Nama role wajib diisi." };

  const fd = new FormData();
  fd.set("nama", nama);
  if (id) fd.set("id", String(id));
  izinDari(formData).forEach((i) => fd.append("izin[]", i));

  try {
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string }>(
      id ? "editrole" : "tambahrole",
      fd,
    );
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan role." };
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan role." };
  }

  revalidatePath("/admin/role");
  redirect("/admin/role?saved=1");
}

export async function hapusRole(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/role?error=Role+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusrole", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/role?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus role.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/role?error=Gagal+menghapus+role");
  }

  revalidatePath("/admin/role");
  redirect("/admin/role?deleted=1");
}

// Set role staf; idrole kosong = lepas role.
export async function setMemberRole(formData: FormData) {
  await requireAdminLevel();
  const idmember = Number(formData.get("idmember"));
  const idrole = String(formData.get("idrole") ?? "");
  if (!idmember) redirect("/admin/role?error=Staf+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("setmemberrole", {
      idmember,
      idrole,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/role?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan role staf.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/role?error=Gagal+menyimpan+role+staf");
  }

  revalidatePath("/admin/role");
  redirect("/admin/role?saved=1");
}
