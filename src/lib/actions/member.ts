"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel } from "@/lib/guard";
import { apiPost, ApiError } from "@/lib/api";

// Label peran member — sama dengan PERAN_BADGE di user-table (komponen client,
// tidak bisa diimpor ke server action).
const PERAN_LABEL: Record<string, string> = {
  "0": "Pengadopsi",
  "1": "Admin",
  "2": "Petugas",
};

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

// Buat akun member baru dari web admin — utamanya akun petugas, tapi peran
// Donatur/Admin juga bisa dipilih. Password memakai skema login lama
// (md5(sha1)) sehingga akun langsung bisa dipakai di web & aplikasi mobile.
export async function tambahMember(formData: FormData): Promise<void> {
  await requireAdminLevel();

  const name = String(formData.get("name") ?? "").trim();
  const emaile = String(formData.get("emaile") ?? "").trim();
  const hp = String(formData.get("hp") ?? "").trim();
  const passe = String(formData.get("passe") ?? "");
  const admin = String(formData.get("admin") ?? "2");
  const bukaForm = `/admin/user?tambah=1`;

  if (!name || !emaile || passe.length < 6) {
    redirect(`${bukaForm}&error=${encodeURIComponent("Nama dan email wajib diisi; password minimal 6 karakter.")}`);
  }

  let error: string | null = null;
  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("tambahmember", {
      name,
      emaile,
      hp,
      passe,
      admin,
    });
    if (Number(res.value) !== 200) {
      error = res.pesan ?? "Gagal membuat akun.";
    }
  } catch {
    error = "Tidak dapat menghubungi server.";
  }

  if (error) redirect(`${bukaForm}&error=${encodeURIComponent(error)}`);
  redirect(
    `/admin/user?created=${encodeURIComponent(
      `Akun ${name} dibuat — langsung bisa dipakai untuk login (web & aplikasi).`,
    )}`,
  );
}

// Ubah peran member yang sudah terdaftar (0 donatur, 1 admin, 2 petugas).
export async function ubahPeranMember(formData: FormData): Promise<void> {
  const session = await requireAdminLevel();

  const idmember = String(formData.get("idmember") ?? "");
  const nama = String(formData.get("nama") ?? "");
  const admin = String(formData.get("admin") ?? "");
  const labelPeran = PERAN_LABEL[admin];

  let error: string | null = null;
  if (!labelPeran) {
    error = "Peran tidak valid.";
  } else {
    try {
      const res = await apiPost<{ value?: string | number; pesan?: string }>("setmemberadmin", {
        idmember,
        admin,
        idadmin: session.userId,
      });
      if (Number(res.value) !== 200) {
        error = res.pesan ?? "Gagal mengubah peran.";
      }
    } catch {
      error = "Tidak dapat menghubungi server.";
    }
  }

  if (error) redirect(`/admin/user?error=${encodeURIComponent(error)}`);
  redirect(
    `/admin/user?updated=${encodeURIComponent(`Peran ${nama} diubah menjadi ${labelPeran}.`)}`,
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
