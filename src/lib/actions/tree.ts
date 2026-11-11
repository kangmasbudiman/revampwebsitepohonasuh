"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

export async function updateTree(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();

  const code = String(formData.get("idpohon") ?? "").trim().toUpperCase();
  const localName = String(formData.get("localName") ?? "").trim();
  const desa = String(formData.get("desa") ?? "").trim();
  const harga = Number(formData.get("priceIdr"));

  if (!code) return { error: "Kode pohon tidak ditemukan." };
  if (!localName) return { error: "Nama lokal wajib diisi." };
  if (!harga || Number.isNaN(harga) || harga < 10000) {
    return { error: "Harga adopsi minimal Rp10.000." };
  }

  const diameter = Number(formData.get("diameterCm"));
  const heightM = Number(formData.get("heightM"));

  // File foto opsional: unggahan menimpa kolom URL.
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0 && foto.size > MAX_FOTO_BYTES) {
    return { error: "Ukuran foto maksimal 2MB." };
  }

  const payload: Record<string, string | number> = {
    idpohon: code,
    localname: localName,
    species: String(formData.get("species") ?? "").trim(),
    ...(desa ? { desa } : {}),
    harga,
    diameter: Number.isNaN(diameter) || !diameter ? 0 : diameter,
    tinggi: Number.isNaN(heightM) || !heightM ? 0 : heightM,
    foto_pohon: String(formData.get("photoUrl") ?? "").trim(),
  };

  let res: { value?: string | number; pesan?: string };
  try {
    if (foto instanceof File && foto.size > 0) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(payload)) fd.append(k, String(v));
      fd.append("foto", foto);
      res = await apiPostForm<{ value?: string | number; pesan?: string }>("editpohon", fd);
    } else {
      res = await apiPost<{ value?: string | number; pesan?: string }>("editpohon", payload);
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan pohon." };
  }
  if (Number(res.value) !== 200) {
    return { error: res.pesan ?? "Gagal menyimpan pohon." };
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/admin/pohon/" + code);
  revalidatePath("/pohon");
  revalidatePath(`/pohon/${code}`);
  redirect(`/admin/pohon/${code}?saved=1`);
}

export async function deleteTree(formData: FormData) {
  await requireAdminLevel();
  const code = String(formData.get("idpohon") ?? "").trim();
  if (!code) redirect("/admin/pohon?error=Pohon+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuspohon", {
      idpohon: code,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pohon?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus pohon.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pohon?error=Gagal+menghapus+pohon");
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  redirect("/admin/pohon?deleted=1");
}

// Jadikan pohon unggulan (highlight=1) — tampil di beranda via pohonhighlight.
export async function setTreeUnggulan(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/pohon?error=Pohon+tidak+ditemukan");
  try {
    await apiPost("setPohonterbaik", { id });
  } catch {
    redirect("/admin/pohon?error=Gagal+menjadikan+unggulan");
  }
  revalidatePath("/admin/pohon");
  revalidatePath("/");
  redirect("/admin/pohon?unggulan=1");
}

export async function removeTreeUnggulan(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/pohon?error=Pohon+tidak+ditemukan");
  try {
    await apiPost("setPohonremove", { id });
  } catch {
    redirect("/admin/pohon?error=Gagal+melepas+unggulan");
  }
  revalidatePath("/admin/pohon");
  revalidatePath("/");
  redirect("/admin/pohon?unggulan=0");
}

// ===== Pembekuan pohon & reservasi oleh admin =====

// Bekukan / aktifkan satu pohon (kolom data_pohon.beku). Pohon beku tetap
// tampil di daftar publik tetapi tidak bisa diadopsi.
export async function toggleTreeFrozen(formData: FormData) {
  await requireAdminLevel();
  const code = String(formData.get("idpohon") ?? "").trim();
  const beku = String(formData.get("beku") ?? "") === "yes" ? "yes" : "no";
  if (!code) redirect("/admin/pohon?error=Pohon+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("bekukanpohon", {
      idpohon: code,
      beku,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pohon?error=${encodeURIComponent(res.pesan ?? "Gagal mengubah status beku.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pohon?error=Gagal+mengubah+status+beku");
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  revalidatePath(`/pohon/${code}`);
  redirect(`/admin/pohon?beku=${beku === "yes" ? "1" : "0"}`);
}

// Pesan pohon untuk pemesan tertentu (status "Dipesan Admin") agar tidak bisa
// diadopsi pengunjung sampai reservasi dibatalkan.
export async function reserveTree(formData: FormData) {
  await requireAdminLevel();
  const code = String(formData.get("idpohon") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  if (!code) redirect("/admin/pohon?error=Pohon+tidak+ditemukan");
  if (!nama) redirect("/admin/pohon?error=Nama+pemesan+wajib+diisi");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("pesanpohonadmin", {
      idpohon: code,
      nama,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pohon?error=${encodeURIComponent(res.pesan ?? "Gagal memesan pohon.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pohon?error=Gagal+memesan+pohon");
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  revalidatePath(`/pohon/${code}`);
  redirect(`/admin/pohon?dipesan=1`);
}

// Batalkan reservasi admin → pohon kembali tersedia.
export async function cancelReserveTree(formData: FormData) {
  await requireAdminLevel();
  const code = String(formData.get("idpohon") ?? "").trim();
  if (!code) redirect("/admin/pohon?error=Pohon+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "batalpesanpohonadmin",
      { idpohon: code },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/pohon?error=${encodeURIComponent(res.pesan ?? "Gagal membatalkan pesanan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pohon?error=Gagal+membatalkan+pesanan");
  }

  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  revalidatePath(`/pohon/${code}`);
  redirect("/admin/pohon?dibatalkan=1");
}

// ===== Galeri foto pohon (tabel imagepohon) =====

const MAX_FOTO_BYTES = 2 * 1024 * 1024;

export async function uploadTreePhoto(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminLevel();
  const code = String(formData.get("idpohon") ?? "").trim();
  if (!code) return { error: "Pohon tidak ditemukan." };

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih foto terlebih dahulu." };
  if (!file.type.startsWith("image/")) return { error: "File harus berupa gambar." };
  if (file.size > MAX_FOTO_BYTES) return { error: "Ukuran foto maksimal 2MB." };

  const fd = new FormData();
  fd.append("image", file);
  fd.append("idpohon", code);

  let res: { value?: string | number; pesan?: string };
  try {
    res = await apiPostForm<{ value?: string | number; pesan?: string }>("uploadimage", fd);
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal mengunggah foto." };
  }
  if (Number(res.value) !== 200) {
    return { error: res.pesan ?? "Gagal mengunggah foto." };
  }

  revalidatePath(`/admin/pohon/${encodeURIComponent(code)}/galeri`);
  revalidatePath(`/pohon/${encodeURIComponent(code)}`);
  return { saved: true };
}

export async function deleteTreePhoto(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const code = String(formData.get("idpohon") ?? "").trim();
  if (!id) redirect(`/admin/pohon/${encodeURIComponent(code)}/galeri?error=Foto+tidak+ditemukan`);

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuspohonimage", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/pohon/${encodeURIComponent(code)}/galeri?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus foto.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/pohon/${encodeURIComponent(code)}/galeri?error=Gagal+menghapus+foto`);
  }

  revalidatePath(`/admin/pohon/${encodeURIComponent(code)}/galeri`);
  revalidatePath(`/pohon/${encodeURIComponent(code)}`);
  redirect(`/admin/pohon/${encodeURIComponent(code)}/galeri?hapus=1`);
}
