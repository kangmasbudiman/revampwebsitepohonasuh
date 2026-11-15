"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";

export async function tambahMitra(formData: FormData) {
  await requireAdminLevel();
  const nama = String(formData.get("nama") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const aktif = String(formData.get("aktif") ?? "1");
  if (!nama) redirect("/admin/mitra?error=Nama+mitra+wajib+diisi");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "tambahmitra",
      { nama, slug, aktif },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menambah mitra.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra?error=Gagal+menambah+mitra");
  }

  revalidatePath("/admin/mitra");
  redirect("/admin/mitra?created=1");
}

export async function editMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const nama = String(formData.get("nama") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const aktif = String(formData.get("aktif") ?? "1");
  if (!id) redirect("/admin/mitra?error=Mitra+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "editmitra",
      { id, nama, slug, aktif },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan mitra.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra?error=Gagal+menyimpan+mitra");
  }

  revalidatePath("/admin/mitra");
  redirect("/admin/mitra?saved=1");
}

export async function hapusMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/mitra?error=Mitra+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "hapusmitra",
      { id },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus mitra.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra?error=Gagal+menghapus+mitra");
  }

  revalidatePath("/admin/mitra");
  redirect("/admin/mitra?deleted=1");
}
export async function tahanPohonMitra(formData: FormData) {
  await requireAdminLevel();
  const mitraId = Number(formData.get("mitra_id"));
  const codes = [
    ...formData.getAll("idpohon").map((v) => String(v).trim()),
    ...String(formData.get("idpohonStr") ?? "").split(","),
  ]
    .map((c) => c.trim())
    .filter(Boolean);
  if (!mitraId) redirect("/admin/pohon?error=Pilih+mitra");
  if (codes.length === 0) redirect("/admin/pohon?error=Pilih+minimal+satu+pohon");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string; jumlah?: number; dilewati?: number }>(
      "tahanpohonmitra",
      { mitra_id: mitraId, idpohon: codes.join(",") },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/pohon?error=${encodeURIComponent(res.pesan ?? "Gagal menahan pohon.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pohon?error=Gagal+menahan+pohon");
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  redirect("/admin/pohon?mitra=1");
}

export async function inputAdopsiMitra(formData: FormData) {
  await requireAdminLevel();
  const mitraId = Number(formData.get("mitra_id"));
  const items = String(formData.get("items") ?? "[]");
  if (!mitraId) redirect("/admin/adopsi-mitra?error=Pilih+mitra");

  try {
    const res = await apiPost<{
      value?: string | number;
      pesan?: string;
      invoice?: string;
      id?: number;
      jumlah?: number;
      dilewati?: number;
      errors?: { idpohon: string; pesan: string }[];
    }>("inputadopsimitra", { mitra_id: mitraId, items, iduser: 1 });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/adopsi-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal input adopsi.")}` +
          (res.errors ? `&detail=${encodeURIComponent(JSON.stringify(res.errors))}` : ""),
      );
    }
    revalidatePath("/admin/adopsi");
    revalidatePath("/admin/adopsi-mitra");
    revalidatePath("/pohon");
    redirect(
      `/admin/adopsi-mitra?sukses=1&jumlah=${Number(res.jumlah) || 0}&dilewati=${Number(res.dilewati) || 0}` +
        (res.invoice ? `&invoice=${encodeURIComponent(res.invoice)}` : ""),
    );
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/adopsi-mitra?error=Gagal+input+adopsi");
  }
}

export async function uploadTaggingMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const file = formData.get("file");
  if (!id) redirect("/admin/mitra?error=Mitra+tidak+ditemukan");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/mitra?error=File+gambar+wajib+diisi");
  }

  try {
    const up = await apiPostForm<{ value?: string | number; cover?: string; pesan?: string }>(
      "uploadcover",
      formData,
    );
    if (Number(up.value) !== 200 || !up.cover) {
      redirect(`/admin/mitra?error=${encodeURIComponent(up.pesan ?? "Gagal upload gambar.")}`);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "editmitra",
      { id, tagging_template: up.cover },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan desain.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra?error=Gagal+upload+desain");
  }

  revalidatePath("/admin/mitra");
  redirect("/admin/mitra?saved=1");
}
