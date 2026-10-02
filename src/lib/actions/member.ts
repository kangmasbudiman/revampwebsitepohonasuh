"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, ApiError } from "@/lib/api";

// Aktif/nonaktifkan member — akun nonaktif ditolak saat login (web & mobile).
export async function updateStatusMember(formData: FormData): Promise<void> {
  const session = await requireAdminLevel();

  const idmember = String(formData.get("idmember") ?? "");
  const aktif = String(formData.get("aktif") ?? "");
  const nama = String(formData.get("nama") ?? "");

  let error: string | null = null;
  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "updatestatusmember",
      { idmember, aktif, idadmin: session.userId },
    );
    if (Number(res.value) !== 200) {
      error = res.pesan ?? "Gagal mengubah status.";
    }
  } catch {
    error = "Tidak dapat menghubungi server.";
  }

  if (error) redirect(`/admin/user?error=${encodeURIComponent(error)}`);
  redirect(
    `/admin/user?updated=${encodeURIComponent(
      aktif === "1" ? `Akun ${nama} diaktifkan kembali.` : `Akun ${nama} dinonaktifkan — tidak bisa login.`,
    )}`,
  );
}

// Kirim pesan manual ke member (muncul di lonceng notifikasi web & app).
// Endpoint pesanNotif tidak mengembalikan body → res.json() melempar
// SyntaxError; hanya ApiError (koneksi/HTTP) yang berarti gagal.
export async function kirimPesan(formData: FormData): Promise<void> {
  await requireAdminLevel();
  const idmember = String(formData.get("idmember") ?? "");
  const nama = String(formData.get("nama") ?? "");
  const pesan = String(formData.get("pesan") ?? "").trim();
  const back = `/admin/user?kirim=${encodeURIComponent(idmember)}`;

  if (!idmember) redirect("/admin/user?error=Member+tidak+ditemukan");
  if (!pesan) redirect(`${back}&error=${encodeURIComponent("Isi pesan wajib diisi.")}`);

  try {
    await apiPost("pesanNotif", { idmember, pesan });
  } catch (e) {
    if (e instanceof ApiError) {
      redirect(`/admin/user?error=${encodeURIComponent("Gagal mengirim pesan. Coba lagi.")}`);
    }
  }

  revalidatePath("/admin/user");
  redirect(
    `/admin/user?updated=${encodeURIComponent(
      `Pesan terkirim ke ${nama} — muncul di lonceng notifikasi member.`,
    )}`,
  );
}
