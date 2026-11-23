"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";

export async function verifikasiPerpanjangan(formData: FormData) {
  const session = await requireAdminLevel();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!id || !["disetujui", "ditolak"].includes(status)) {
    redirect("/admin/perpanjangan?error=Data+tidak+valid");
  }

  const key = process.env.ADMIN_API_KEY ?? "";
  if (!key) redirect("/admin/perpanjangan?error=ADMIN_API_KEY+tidak+diset");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "verifikasiperpanjangan",
      { id, status, iduser: session.userId },
      { "X-Admin-Key": key },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/perpanjangan?error=${encodeURIComponent(res.pesan ?? "Gagal memproses perpanjangan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/perpanjangan?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/perpanjangan");
  revalidatePath("/mitra/program");
  redirect(`/admin/perpanjangan?${status === "disetujui" ? "disetujui" : "ditolak"}=1`);
}
