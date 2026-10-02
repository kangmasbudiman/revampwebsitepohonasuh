"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, apiFetchBinary, backupHeaders } from "@/lib/api";

export async function buatBackup() {
  await requireAdminLevel();

  let file = "";
  try {
    const res = await apiPost<{ value?: number | string; file?: string; pesan?: string }>(
      "backupcreate",
      {},
      backupHeaders(),
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/backup?error=${encodeURIComponent(res.pesan ?? "Gagal membuat backup.")}`);
    }
    file = res.file ?? "";
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/backup?error=Gagal+menghubungi+server+backup");
  }

  revalidatePath("/admin/backup");
  redirect(`/admin/backup?created=${encodeURIComponent(file)}`);
}

export async function hapusBackup(formData: FormData) {
  await requireAdminLevel();
  const file = String(formData.get("file") ?? "");
  if (!file) redirect("/admin/backup?error=File+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: number | string; pesan?: string }>(
      "backupdelete",
      { file },
      backupHeaders(),
    );
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/backup?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus backup.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/backup?error=Gagal+menghapus+backup");
  }

  revalidatePath("/admin/backup");
  redirect("/admin/backup?deleted=1");
}

// Unduh file backup sebagai base64 — client membentuk Blob lalu memicu
// dialog unduh browser (file ±ratusan KB, aman lewat payload action).
export async function unduhBackup(
  name: string,
): Promise<{ name: string; data: string }> {
  await requireAdminLevel();
  const buf = await apiFetchBinary(
    `backupfile?file=${encodeURIComponent(name)}`,
    backupHeaders(),
  );
  return { name, data: Buffer.from(buf).toString("base64") };
}
