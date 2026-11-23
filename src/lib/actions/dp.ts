"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost } from "@/lib/api";

export async function verifikasiDp(formData: FormData) {
  const session = await requireAdminLevel();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!id || !["disetujui", "ditolak"].includes(status)) {
    redirect("/admin/verifikasi-dp?error=Data+tidak+valid");
  }

  const key = process.env.ADMIN_API_KEY ?? "";
  if (!key) redirect("/admin/verifikasi-dp?error=ADMIN_API_KEY+tidak+diset");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "verifikasidp",
      { id, status, iduser: session.userId },
      { "X-Admin-Key": key },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/verifikasi-dp?error=${encodeURIComponent(res.pesan ?? "Gagal memverifikasi DP.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/verifikasi-dp?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/verifikasi-dp");
  revalidatePath("/mitra/tagihan");
  revalidatePath("/mitra/riwayat-pesanan");
  redirect(`/admin/verifikasi-dp?${status === "disetujui" ? "disetujui" : "ditolak"}=1`);
}
