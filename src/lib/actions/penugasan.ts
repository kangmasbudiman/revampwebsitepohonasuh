"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";

// updatedesapetugas bersifat full-replace: kirim seluruh id petugas
// terpilih (string koma) atau string kosong untuk mengosongkan.
export async function saveDesaPetugas(formData: FormData) {
  await requireAdminLevel();

  const iddesa = Number(formData.get("iddesa"));
  if (!iddesa) redirect("/admin/penugasan?error=Desa+tidak+ditemukan");

  const ids = formData.getAll("petugas").map(String).filter(Boolean);

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("updatedesapetugas", {
      iddesa,
      idpetugas: ids.join(","),
    });
    if (Number(res.value) !== 200) {
      redirect(
        `/admin/penugasan?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan penugasan.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/penugasan?error=Gagal+menyimpan+penugasan");
  }

  revalidatePath("/admin/penugasan");
  redirect("/admin/penugasan?saved=1");
}
