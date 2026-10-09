"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiPost, apiPostForm } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { updateSession } from "@/lib/auth";

type ProfileResponse = { value?: string | number; pesan?: string; foto?: string };

const KEMBALI = "/dashboard/profil";

// Simpan data diri (nama/hp/pekerjaan/alamat). Nama yang berubah ikut
// memperbarui session agar header langsung menampilkan nama baru.
export async function updateProfile(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const session = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const hp = String(formData.get("hp") ?? "").trim();
  const job = String(formData.get("job") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name || !hp) return { error: "Nama dan nomor HP wajib diisi." };

  let res: ProfileResponse;
  try {
    res = await apiPost<ProfileResponse>("updateprofil", {
      id: session.userId,
      name,
      hp,
      job,
      address,
    });
  } catch {
    return { error: "Tidak dapat menghubungi server. Coba lagi sebentar." };
  }
  if (String(res.value) !== "200") {
    return { error: res.pesan ?? "Gagal menyimpan profil." };
  }

  if (name !== session.name) await updateSession({ name });
  revalidatePath("/", "layout");
  redirect(`${KEMBALI}?saved=data`);
}

// Upload foto profil (multipart). Foto baru otomatis dipakai Avatar di
// header/panel admin via session.photo.
export async function uploadFoto(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const session = await requireUser();

  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return { error: "Pilih file foto terlebih dahulu." };
  }

  const fd = new FormData();
  fd.set("id", String(session.userId));
  fd.set("foto", foto);

  let res: ProfileResponse;
  try {
    res = await apiPostForm<ProfileResponse>("uploadfotoprofil", fd);
  } catch {
    return { error: "Tidak dapat menghubungi server. Coba lagi sebentar." };
  }
  if (String(res.value) !== "200" || !res.foto) {
    return { error: res.pesan ?? "Gagal mengunggah foto." };
  }

  await updateSession({ photo: res.foto });
  revalidatePath("/", "layout");
  redirect(`${KEMBALI}?saved=foto`);
}

// Ganti password — verifikasi konfirmasi dilakukan di sini (di luar klien)
// selain validasi panjang minimal di endpoint.
export async function gantiPassword(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const session = await requireUser();

  const lama = String(formData.get("passe_lama") ?? "");
  const baru = String(formData.get("passe_baru") ?? "");
  const konfirmasi = String(formData.get("passe_konfirmasi") ?? "");

  if (!lama || !baru) return { error: "Password lama dan baru wajib diisi." };
  if (baru.length < 6) return { error: "Password baru minimal 6 karakter." };
  if (baru === lama) {
    return { error: "Password yang Anda masukkan masih sama dengan password lama." };
  }
  if (baru !== konfirmasi) return { error: "Konfirmasi password tidak cocok." };

  let res: ProfileResponse;
  try {
    res = await apiPost<ProfileResponse>("gantipassword", {
      id: session.userId,
      passe_lama: lama,
      passe_baru: baru,
    });
  } catch {
    return { error: "Tidak dapat menghubungi server. Coba lagi sebentar." };
  }
  if (String(res.value) !== "200") {
    return { error: res.pesan ?? "Gagal mengganti password." };
  }

  redirect(`${KEMBALI}?saved=pw`);
}
