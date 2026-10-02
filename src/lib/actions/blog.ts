"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_COVER_BYTES = 2 * 1024 * 1024;

// Cover diupload terpisah (uploadcover → filename) lalu filename disimpan
// di kolom blog.cover — konsisten dengan reader lama yang mem-prefix /assets/.
async function uploadCover(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiPostForm<{ value?: string | number; pesan?: string; cover?: string }>(
    "uploadcover",
    fd,
  );
  if (Number(res.value) !== 200 || !res.cover) {
    throw new Error(res.pesan ?? "Gagal mengunggah cover.");
  }
  return res.cover;
}

function validateBlog(formData: FormData): { error?: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!title || !description || !category) {
    return { error: "Judul, deskripsi, dan kategori wajib diisi." };
  }
  if (!["artikel", "berita"].includes(category)) {
    return { error: "Kategori harus artikel atau berita." };
  }
  const file = formData.get("cover");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Cover harus berupa gambar." };
    if (file.size > MAX_COVER_BYTES) return { error: "Ukuran cover maksimal 2MB." };
  }
  return {};
}

export async function createBlog(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireAdminLevel();

  const invalid = validateBlog(formData);
  if (invalid.error) return invalid;

  const file = formData.get("cover");
  let cover: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      cover = await uploadCover(file);
    }
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahblog", {
      name: String(formData.get("title") ?? "").trim(),
      deskripsi: String(formData.get("description") ?? "").trim(),
      kategori: String(formData.get("category") ?? "").trim(),
      idmember: session.userId,
      cover,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah artikel." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah artikel." };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  return { saved: true };
}

export async function updateBlog(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Artikel tidak ditemukan." };

  const invalid = validateBlog(formData);
  if (invalid.error) return invalid;

  const file = formData.get("cover");
  let cover: string | undefined;
  try {
    if (file instanceof File && file.size > 0) {
      cover = await uploadCover(file);
    }
    // Tanpa file baru, field cover tidak dikirim — editblog hanya
    // memperbarui field terisi sehingga cover lama dipertahankan.
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editblog", {
      id,
      name: String(formData.get("title") ?? "").trim(),
      deskripsi: String(formData.get("description") ?? "").trim(),
      kategori: String(formData.get("category") ?? "").trim(),
      cover,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan artikel." };
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan artikel." };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${id}`);
  revalidatePath("/");
  redirect("/admin/blog?saved=1");
}

export async function deleteBlog(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/blog?error=Artikel+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusblog", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/blog?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus artikel.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/blog?error=Gagal+menghapus+artikel");
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/blog?deleted=1");
}
