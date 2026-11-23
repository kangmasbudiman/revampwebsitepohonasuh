"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel, requireUser } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import { durasiDariTanggal } from "@/lib/format";
import type { AdminState } from "@/lib/actions/admin";

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
  const programId = Number(formData.get("program_id")) || 0;
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
    }>("inputadopsimitra", { mitra_id: mitraId, program_id: programId || undefined, items, iduser: 1 });
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

export async function setMemberMitra(formData: FormData) {
  await requireAdminLevel();
  const idMember = Number(formData.get("idmember"));
  const mitraId = Number(formData.get("mitra_id")) || 0;
  if (!idMember) redirect("/admin/mitra?error=ID+member+wajib+diisi");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "setmembermitra",
      { idmember: idMember, mitra_id: mitraId || null },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menautkan akun.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra?error=Gagal+menautkan+akun");
  }

  revalidatePath("/admin/mitra");
  redirect("/admin/mitra?saved=1");
}

export async function approveMitraHold(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/mitra-requests?error=Request+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "mitraapprovehold",
      { id, iduser: 1 },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra-requests?error=${encodeURIComponent(res.pesan ?? "Gagal menyetujui.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra-requests?error=Gagal+menyetujui");
  }

  revalidatePath("/admin/mitra-requests");
  revalidatePath("/admin/pohon");
  redirect("/admin/mitra-requests?approved=1");
}

export async function rejectMitraHold(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/mitra-requests?error=Request+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "mitrarejecthold",
      { id },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra-requests?error=${encodeURIComponent(res.pesan ?? "Gagal menolak.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra-requests?error=Gagal+menolak");
  }

  revalidatePath("/admin/mitra-requests");
  redirect("/admin/mitra-requests?rejected=1");
}

export async function requestHoldMitra(formData: FormData) {
  const session = await requireUser();
  const codes = [
    ...formData.getAll("idpohon").map((v) => String(v).trim()),
    ...String(formData.get("idpohonStr") ?? "").split(","),
  ]
    .map((c) => c.trim())
    .filter(Boolean);
  if (codes.length === 0) redirect("/mitra/pohon?error=Pilih+minimal+satu+pohon");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string; jumlah?: number }>(
      "mitrarequesthold",
      { idmember: session.userId, idpohon: codes.join(",") },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/pohon?error=${encodeURIComponent(res.pesan ?? "Gagal request hold.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/pohon?error=Gagal+request+hold");
  }

  revalidatePath("/mitra/pohon");
  redirect("/mitra/pohon?sukses=1");
}

export async function buatAkunMitra(formData: FormData) {
  await requireAdminLevel();
  const mitraId = Number(formData.get("mitra_id"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const hp = String(formData.get("hp") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!mitraId) redirect("/admin/mitra?error=Pilih+mitra");
  if (!name || !email || !password) redirect("/admin/mitra?error=Nama%2C+email%2C+password+wajib+diisi");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string; id?: number; email?: string }>(
      "buatakunmitra",
      { mitra_id: mitraId, name, emaile: email, hp, passe: password },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/mitra?error=${encodeURIComponent(res.pesan ?? "Gagal membuat akun.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/mitra?error=Gagal+membuat+akun");
  }

  revalidatePath("/admin/mitra");
  redirect(
    `/admin/mitra?akun=1&email=${encodeURIComponent(email)}&pass=${encodeURIComponent(password)}`,
  );
}

export async function tambahProgramMitra(formData: FormData) {
  await requireAdminLevel();
  const mitraId = Number(formData.get("mitra_id"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!mitraId || !nama) redirect("/admin/program-mitra?error=Mitra+dan+nama+program+wajib");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "tambahprogrammitra",
      {
        mitra_id: mitraId,
        nama,
        deskripsi: String(formData.get("deskripsi") ?? "").trim(),
        tgl_mulai: String(formData.get("tgl_mulai") ?? "").trim(),
        tgl_selesai: String(formData.get("tgl_selesai") ?? "").trim(),
        durasi: String(formData.get("durasi") ?? "").trim(),
        aktif: String(formData.get("aktif") ?? "1"),
      },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/program-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menambah program.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/program-mitra?error=Gagal+menambah+program");
  }

  revalidatePath("/admin/program-mitra");
  redirect("/admin/program-mitra?created=1");
}

export async function hapusProgramMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/program-mitra?error=Program+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "hapusprogrammitra",
      { id },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/program-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus program.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/program-mitra?error=Gagal+menghapus+program");
  }

  revalidatePath("/admin/program-mitra");
  redirect("/admin/program-mitra?deleted=1");
}

// Normalisasi budget: buang "Rp", pemisah ribuan, spasi → angka murni.
function normalizeBudget(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? String(Number(digits)) : "";
}

export async function tambahProgramMitraSelf(formData: FormData) {
  const session = await requireUser();
  // resolve mitra_id from session
  let mitraId = session.mitraId;
  if (!mitraId) {
    try {
      const info = await apiPost<{ value?: number; mitra?: { id: number } }>("mitramyinfo", { idmember: session.userId });
      if (Number(info.value) === 200) mitraId = Number(info.mitra?.id);
    } catch {
      // ignore
    }
  }
  if (!mitraId) redirect("/mitra?error=Bukan+akun+mitra");

  const nama = String(formData.get("nama") ?? "").trim();
  if (!nama) redirect("/mitra/program?error=Nama+program+wajib");

  // Upload logo program (opsional)
  let logo: string | null = null;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const up = await apiPostForm<{ value?: string | number; cover?: string; pesan?: string }>("uploadcover", fd);
      if (Number(up.value) === 200 && up.cover) logo = up.cover;
    } catch {
      // logo gagal di-upload — tetap lanjut tanpa logo
    }
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "tambahprogrammitra",
      {
        mitra_id: mitraId,
        nama,
        deskripsi: String(formData.get("deskripsi") ?? "").trim(),
        logo,
        tgl_mulai: String(formData.get("tgl_mulai") ?? "").trim(),
        tgl_selesai: String(formData.get("tgl_selesai") ?? "").trim(),
        durasi: durasiDariTanggal(formData.get("tgl_mulai") as string | null, formData.get("tgl_selesai") as string | null),
        aktif: String(formData.get("aktif") ?? "1"),
        budget: normalizeBudget(String(formData.get("budget") ?? "")),
        budget_detail: String(formData.get("budget_detail") ?? ""),
        provinsi: formData.getAll("provinsi").map((s) => String(s).trim()).filter(Boolean).join(","),
      },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/program?error=${encodeURIComponent(res.pesan ?? "Gagal menambah program.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/program?error=Gagal+menambah+program");
  }

  revalidatePath("/mitra/program");
  redirect("/mitra/program?created=1");
}

export async function editProgramMitraSelf(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireUser();
  // resolve mitra_id from session
  let mitraId = session.mitraId;
  if (!mitraId) {
    try {
      const info = await apiPost<{ value?: number; mitra?: { id: number } }>("mitramyinfo", { idmember: session.userId });
      if (Number(info.value) === 200) mitraId = Number(info.mitra?.id);
    } catch {
      // ignore
    }
  }
  if (!mitraId) redirect("/mitra?error=Bukan+akun+mitra");

  const id = Number(formData.get("id"));
  const nama = String(formData.get("nama") ?? "").trim();
  if (!id) redirect("/mitra/program?error=Program+tidak+ditemukan");
  if (!nama) redirect("/mitra/program?error=Nama+program+wajib");

  // Upload logo program (opsional)
  let logo: string | null = null;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const up = await apiPostForm<{ value?: string | number; cover?: string; pesan?: string }>("uploadcover", fd);
      if (Number(up.value) === 200 && up.cover) logo = up.cover;
    } catch {
      // logo gagal di-upload — tetap lanjut tanpa logo
    }
  }

  const data: Record<string, string | number | null | undefined> = {
    id,
    mitra_id: mitraId,
    nama,
    deskripsi: String(formData.get("deskripsi") ?? "").trim(),
    tgl_mulai: String(formData.get("tgl_mulai") ?? "").trim(),
    tgl_selesai: String(formData.get("tgl_selesai") ?? "").trim(),
    durasi: durasiDariTanggal(formData.get("tgl_mulai") as string | null, formData.get("tgl_selesai") as string | null),
    aktif: String(formData.get("aktif") ?? "1"),
    budget: normalizeBudget(String(formData.get("budget") ?? "")),
    budget_detail: String(formData.get("budget_detail") ?? ""),
    provinsi: formData.getAll("provinsi").map((s) => String(s).trim()).filter(Boolean).join(","),
  };
  if (logo) data.logo = logo;

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editprogrammitra", data);
    if (Number(res.value) !== 200) {
      redirect(`/mitra/program?error=${encodeURIComponent(res.pesan ?? "Gagal memperbarui program.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/program?error=Gagal+memperbarui+program");
  }

  revalidatePath("/mitra/program");
  redirect("/mitra/program?updated=1");
}

export async function hapusProgramMitraSelf(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!id) redirect("/mitra/program");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapusprogrammitra", { id });
    if (Number(res.value) !== 200) {
      redirect(`/mitra/program?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus program.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/program?error=Gagal+menghapus+program");
  }

  revalidatePath("/mitra/program");
  revalidatePath("/dashboard");
  redirect("/mitra/program?deleted=1");
}

export async function hapusPesananMitra(formData: FormData) {
  const session = await requireUser();
  const id = Number(formData.get("id"));
  if (!id) redirect("/mitra/riwayat-pesanan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("mitrahapuspesanan", {
      id,
      idmember: session.userId,
    });
    if (Number(res.value) !== 200) {
      redirect(`/mitra/riwayat-pesanan?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus pesanan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/riwayat-pesanan?error=Gagal+menghapus+pesanan");
  }

  revalidatePath("/mitra/riwayat-pesanan");
  revalidatePath("/mitra/pesanan");
  redirect("/mitra/riwayat-pesanan?dihapus=1");
}

export async function ajukanDp(formData: FormData) {
  const session = await requireUser();
  const id = Number(formData.get("pesanan_id"));
  const jumlah = Number(formData.get("jumlah"));
  if (!id || !(jumlah > 0)) redirect("/mitra/tagihan?error=Jumlah+DP+tidak+valid");

  let bukti = "";
  const file = formData.get("bukti");
  if (file instanceof File && file.size > 0) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const up = await apiPostForm<{ value?: string | number; cover?: string }>("uploadcover", fd);
      if (Number(up.value) === 200 && up.cover) bukti = up.cover;
    } catch {
      // upload gagal — tetap lanjut, validasi bukti di bawah
    }
  }
  if (!bukti) redirect("/mitra/tagihan?error=Bukti+transfer+wajib+diisi");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("ajukandp", {
      idmember: session.userId,
      id,
      jumlah,
      bukti,
    });
    if (Number(res.value) !== 200) {
      redirect(`/mitra/tagihan?error=${encodeURIComponent(res.pesan ?? "Gagal mengajukan DP.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/tagihan?error=Gagal+mengajukan+DP");
  }

  revalidatePath("/mitra/tagihan");
  revalidatePath("/mitra/riwayat-pesanan");
  redirect("/mitra/tagihan?dp=1");
}

export async function ajukanPerpanjangan(formData: FormData) {
  const session = await requireUser();
  const programId = Number(formData.get("program_id"));
  const tgl = String(formData.get("tgl_selesai_baru") ?? "").trim();
  const alasan = String(formData.get("alasan") ?? "").trim();
  if (!programId || !tgl) redirect("/mitra/program?error=Program+dan+tanggal+selesai+wajib");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("ajukanperpanjangan", {
      idmember: session.userId,
      program_id: programId,
      tgl_selesai_baru: tgl,
      alasan,
    });
    if (Number(res.value) !== 200) {
      redirect(`/mitra/program?error=${encodeURIComponent(res.pesan ?? "Gagal mengajukan perpanjangan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/program?error=Gagal+mengajukan+perpanjangan");
  }

  revalidatePath("/mitra/program");
  revalidatePath("/admin/perpanjangan");
  redirect("/mitra/program?perpanjang=1");
}

export async function daftarMitra(formData: FormData) {
  const nama = String(formData.get("nama") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const namaPj = String(formData.get("nama_pj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hp = String(formData.get("hp") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (nama === "" || email === "" || password === "") {
    redirect("/daftar-mitra?error=Nama+lembaga%2C+email%2C+dan+password+wajib+diisi");
  }
  if (password.length < 6) {
    redirect("/daftar-mitra?error=Password+minimal+6+karakter");
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "daftarmitra",
      { nama, alamat, nama_pj: namaPj, email, hp, passe: password },
    );
    if (Number(res.value) !== 200) {
      redirect(`/daftar-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal registrasi.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/daftar-mitra?error=${encodeURIComponent("Gagal menghubungi server — periksa koneksi dan coba lagi.")}`);
  }

  redirect("/masuk?terdaftar=1");
}

export async function requestPesananMitra(formData: FormData) {
  const session = await requireUser();
  let mitraId = session.mitraId;
  if (!mitraId) {
    try {
      const info = await apiPost<{ value?: number; mitra?: { id: number } }>("mitramyinfo", { idmember: session.userId });
      if (Number(info.value) === 200) mitraId = Number(info.mitra?.id);
    } catch {}
  }
  if (!mitraId) redirect("/mitra/pesanan?error=Bukan+akun+mitra");

  const desa = String(formData.get("desa") ?? "").trim();
  const jumlah = Number(formData.get("jumlah") ?? 0);
  const programId = Number(formData.get("program_id") ?? 0);
  const catatan = String(formData.get("catatan") ?? "").trim();
  const pohonPilihan = String(formData.get("pohon_pilihan") ?? "").trim();

  // jika ada pohon dipilih → jumlah otomatis dari pilihan (di-validasi backend)
  const hasPilihan = pohonPilihan.split(",").filter((c) => c.trim()).length > 0;
  if (!hasPilihan && (!jumlah || jumlah < 1)) redirect("/mitra/pesanan?error=Jumlah+wajib+diisi");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "mitrarequesorder",
      { idmember: session.userId, desa, jumlah: hasPilihan ? undefined : jumlah, program_id: programId || undefined, catatan, pohon_pilihan: pohonPilihan || undefined },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/pesanan?error=${encodeURIComponent(res.pesan ?? "Gagal mengirim pesanan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/pesanan?error=Gagal+menghubungi+server");
  }

  revalidatePath("/mitra/pesanan");
  redirect("/mitra/pesanan?sukses=1");
}

export async function setPersetujuanProgram(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const aktif = Number(formData.get("aktif"));
  if (!id) redirect("/admin/program-mitra?error=Program+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editprogrammitra", { id, aktif });
    if (Number(res.value) !== 200) {
      redirect(`/admin/program-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal mengubah persetujuan program.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/program-mitra?error=Gagal+mengubah+persetujuan");
  }

  revalidatePath("/admin/program-mitra");
  revalidatePath("/mitra/program");
  redirect(`/admin/program-mitra?${aktif === 1 ? "disetujui" : "dibatalkan"}=1`);
}

export async function approvePesananMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  const pohonPilihanAdmin = String(formData.get("pohon_pilihan_admin") ?? "").trim();
  if (!id) redirect("/admin/pesanan-mitra?error=Pesanan+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "mitraapprovepesanan",
      { id, iduser: 1, pohon_pilihan_admin: pohonPilihanAdmin || undefined },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/pesanan-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menyetujui.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pesanan-mitra?error=Gagal+menyetujui");
  }

  revalidatePath("/admin/pesanan-mitra");
  revalidatePath("/admin/pohon");
  redirect("/admin/pesanan-mitra?approved=1");
}

export async function rejectPesananMitra(formData: FormData) {
  await requireAdminLevel();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/pesanan-mitra?error=Pesanan+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "mitrarejectpesanan",
      { id },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/pesanan-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal menolak.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/pesanan-mitra?error=Gagal+menolak");
  }

  revalidatePath("/admin/pesanan-mitra");
  redirect("/admin/pesanan-mitra?rejected=1");
}

export async function setTaggingProgramMitra(formData: FormData) {
  const session = await requireUser();
  let mitraId = session.mitraId;
  if (!mitraId) {
    try {
      const info = await apiPost<{ value?: number; mitra?: { id: number } }>("mitramyinfo", { idmember: session.userId });
      if (Number(info.value) === 200) mitraId = Number(info.mitra?.id);
    } catch {}
  }
  if (!mitraId) redirect("/mitra/program?error=Bukan+akun+mitra");

  const programId = Number(formData.get("program_id"));
  const file = formData.get("file");
  let taggingTemplate: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const up = await apiPostForm<{ value?: string | number; cover?: string; pesan?: string }>("uploadcover", fd);
      if (Number(up.value) === 200 && up.cover) taggingTemplate = up.cover;
    } catch {
      // ignore
    }
  }
  if (!taggingTemplate) {
    redirect(`/mitra/desain-tagging?error=Gagal+upload+gambar`);
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "settaggingprogrammitra",
      { idmember: session.userId, program_id: programId, tagging_template: taggingTemplate },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/desain-tagging?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan desain.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/desain-tagging?error=Gagal+menyimpan");
  }

  revalidatePath("/mitra/desain-tagging");
  redirect("/mitra/desain-tagging?saved=1");
}

export async function editMitraProfil(formData: FormData) {
  const session = await requireUser();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const namaPj = String(formData.get("nama_pj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const hp = String(formData.get("hp") ?? "").trim();
  const file = formData.get("logo");
  let logo: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const up = await apiPostForm<{ value?: string | number; cover?: string }>("uploadcover", fd);
      if (Number(up.value) === 200 && up.cover) logo = up.cover;
    } catch {
      // logo gagal diupload — lanjut tanpa logo
    }
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "editmitraprofil",
      { idmember: session.userId, alamat, nama_pj: namaPj, email, hp, ...(logo ? { logo } : {}) },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/pengaturan?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/pengaturan?error=Gagal+menyimpan");
  }

  revalidatePath("/mitra/pengaturan");
  redirect("/mitra/pengaturan?saved=1");
}

export async function gantiPasswordMitra(formData: FormData) {
  const session = await requireUser();
  const lama = String(formData.get("password_lama") ?? "");
  const baru = String(formData.get("password_baru") ?? "");
  const ulang = String(formData.get("password_ulang") ?? "");

  if (lama === "" || baru === "") redirect("/mitra/pengaturan?error=Password+lama+dan+baru+wajib");
  if (baru !== ulang) redirect("/mitra/pengaturan?error=Konfirmasi+password+tidak+cocok");
  if (baru.length < 6) redirect("/mitra/pengaturan?error=Password+baru+minimal+6+karakter");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "gantipasswordmitra",
      { idmember: session.userId, password_lama: lama, password_baru: baru },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/pengaturan?error=${encodeURIComponent(res.pesan ?? "Gagal mengganti password.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/pengaturan?error=Gagal+mengganti+password");
  }

  redirect("/mitra/pengaturan?password=1");
}

export async function setTemplateTaggingMitra(formData: FormData) {
  const session = await requireUser();
  let mitraId = session.mitraId;
  if (!mitraId) {
    try {
      const info = await apiPost<{ value?: number; mitra?: { id: number } }>("mitramyinfo", { idmember: session.userId });
      if (Number(info.value) === 200) mitraId = Number(info.mitra?.id);
    } catch {}
  }
  if (!mitraId) redirect("/mitra/program?error=Bukan+akun+mitra");

  const programId = Number(formData.get("program_id"));
  const template = String(formData.get("template") ?? "");
  if (!programId || !template) redirect("/mitra/desain-tagging?error=Pilih+template");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "settaggingprogrammitra",
      { idmember: session.userId, program_id: programId, tagging_template: template },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/desain-tagging?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan template.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/desain-tagging?error=Gagal+menyimpan+template");
  }

  revalidatePath("/mitra/desain-tagging");
  redirect("/mitra/desain-tagging?template=1");
}

export async function registrasiOrganisasiMitra(formData: FormData) {
  const nama = String(formData.get("nama") ?? "").trim();
  const namaPj = String(formData.get("nama_pj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hp = String(formData.get("hp_pj") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (!nama || !namaPj || !email || !hp || !password) redirect(`/daftar-mitra?error=${encodeURIComponent("Lengkapi semua field wajib.")}`);
  if (password !== password2) redirect(`/daftar-mitra?error=${encodeURIComponent("Konfirmasi kata sandi tidak cocok.")}`);
  if (password.length < 8) redirect(`/daftar-mitra?error=${encodeURIComponent("Kata sandi minimal 8 karakter.")}`);

  // logo wajib
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) redirect(`/daftar-mitra?error=${encodeURIComponent("Logo organisasi wajib diunggah (PNG/JPG/WebP, maks 5 MB).")}`);

  try {
    // Build a new FormData for the API with all fields from current formData
    const fd = new FormData();
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size > 0) fd.set(key, value);
      } else {
        fd.set(key, String(value));
      }
    }
    const res = await apiPostForm<{ value?: string | number; pesan?: string; id?: number; email?: string; sumber_token?: string }>(
      "daftarmgregistration",
      fd,
    );
    if (Number(res.value) !== 201) {
      redirect(`/daftar-mitra?error=${encodeURIComponent(res.pesan ?? "Gagal mendaftar.")}`);
    }
    const sumber = res.sumber_token ? `&sumber=${encodeURIComponent(res.sumber_token)}` : "";
    redirect(`/pendaftaran-berhasil?id=${Number(res.id) || 0}${sumber}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/daftar-mitra?error=${encodeURIComponent("Gagal menghubungi server — periksa koneksi dan coba lagi.")}`);
  }
}

export async function mintaDokumenUlangAction(formData: FormData) {
  await requireAdminLevel();
  const idorga = Number(formData.get("idorga")) || 0;
  if (!idorga) redirect("/admin/pendaftaran-organisasi?error=ID+tidak+ditemukan");

  const key = process.env.ADMIN_API_KEY ?? "";
  if (!key) redirect(`/admin/pendaftaran-organisasi/${idorga}?error=${encodeURIComponent("ADMIN_API_KEY tidak diset")}`);

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/requestdokumentok`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Admin-Key": key },
      body: new URLSearchParams({ idorga: String(idorga) }),
    });
    const json = await res.json();
    if (Number(json.value) !== 200) {
      redirect(`/admin/pendaftaran-organisasi/${idorga}?error=${encodeURIComponent(json.pesan ?? "Gagal mengirim email.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/pendaftaran-organisasi/${idorga}?error=${encodeURIComponent("Gagal menghubungi server.")}`);
  }

  revalidatePath(`/admin/pendaftaran-organisasi/${idorga}`);
  redirect(`/admin/pendaftaran-organisasi/${idorga}?dokreq=1`);
}

export async function uploadDokumenMitra(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) redirect("/upload-dokumen?error=Link+tidak+valid");

  const fd = new FormData();
  fd.set("token", token);
  for (const [key, value] of formData.entries()) {
    if (key === "token") continue;
    if (value instanceof File) {
      if (value.size > 0) fd.set(key, value);
    }
  }

  try {
    const res = await apiPostForm<{ value?: string | number; pesan?: string }>(
      "simpandokumentok",
      fd,
    );
    if (Number(res.value) !== 200) {
      redirect(`/upload-dokumen?token=${encodeURIComponent(token)}&error=${encodeURIComponent(res.pesan ?? "Gagal mengunggah.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/upload-dokumen?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Gagal menghubungi server.")}`);
  }

  redirect("/upload-dokumen?selesai=1");
}

export async function organisasiSetAction(formData: FormData) {
  await requireAdminLevel();
  const idorga = Number(formData.get("idorga")) || 0;
  const aksi = String(formData.get("aksi") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!idorga) redirect("/admin/pendaftaran-organisasi?error=ID+tidak+ditemukan");

  const key = process.env.ADMIN_API_KEY ?? "";
  if (!key) redirect("/admin/pendaftaran-organisasi?error=ADMIN_API_KEY+tidak+diset");

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/organisasiSetAdmin`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Admin-Key": key },
      body: new URLSearchParams({ idorga: String(idorga), aksi, note }),
    });
    const json = await res.json();
    if (Number(json.value) !== 200) {
      redirect(`/admin/pendaftaran-organisasi?error=${encodeURIComponent(json.pesan ?? "Gagal.")}`);
    }
  } catch {
    redirect("/admin/pendaftaran-organisasi?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/pendaftaran-organisasi");
  redirect("/admin/pendaftaran-organisasi?saved=1");
}

export async function batalkanPesananMitra(formData: FormData) {
  const session = await requireUser();
  const id = Number(formData.get("id")) || 0;
  const alasan = String(formData.get("alasan") ?? "").trim();

  if (!id) redirect("/mitra/pembatalan?error=Pilih+pesanan+yang+ingin+dibatalkan");
  if (alasan.length < 10) redirect(`/mitra/pembatalan?error=${encodeURIComponent("Alasan pembatalan minimal 10 karakter")}`);

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>(
      "mitrabatalkanpesanan",
      { idmember: session.userId, id, alasan },
    );
    if (Number(res.value) !== 200) {
      redirect(`/mitra/pembatalan?error=${encodeURIComponent(res.pesan ?? "Gagal membatalkan pesanan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/pembatalan?error=Gagal+menghubungi+server");
  }

  revalidatePath("/mitra/pembatalan");
  redirect("/mitra/pembatalan?ok=1");
}

export async function inputAdopsiMitraSelf(formData: FormData) {
  const session = await requireUser();
  const programId = Number(formData.get("program_id")) || 0;
  const items = String(formData.get("items") ?? "[]");
  if (!items || items === "[]") redirect("/mitra/adopsi?error=Tambahkan+minimal+1+pengadopsi");

  let invoiceSlug = "";
  try {
    const res = await apiPost<{
      value?: string | number;
      pesan?: string;
      jumlah?: number;
      dilewati?: number;
      invoice?: string | null;
    }>("inputadopsimitraself", { idmember: session.userId, program_id: programId || undefined, items });
    if (Number(res.value) !== 200) {
      redirect(`/mitra/adopsi?error=${encodeURIComponent(res.pesan ?? "Gagal input adopsi.")}`);
    }
    if (typeof res.invoice === "string" && res.invoice) {
      invoiceSlug = res.invoice.replace(/^#/, "").trim();
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/mitra/adopsi?error=Gagal+input+adopsi");
  }

  revalidatePath("/mitra/adopsi");
  revalidatePath("/mitra/laporan");
  revalidatePath("/mitra/tagihan");
  if (invoiceSlug) {
    redirect(`/mitra/bayar/${encodeURIComponent(invoiceSlug)}`);
  }
  redirect("/mitra/tagihan");
}

export async function verifikasiAdopsiMitraAction(formData: FormData) {
  const session = await requireAdminLevel();
  const invoice = String(formData.get("invoice") ?? "").trim();
  if (!invoice) redirect("/admin/verifikasi-adopsi-mitra?error=Invoice+tidak+ditemukan");

  const key = process.env.ADMIN_API_KEY ?? "";
  if (!key) redirect("/admin/verifikasi-adopsi-mitra?error=ADMIN_API_KEY+tidak+diset");

  try {
    const res = await fetch(`${process.env.API_BASE_URL}/verifikasiadopsimitra`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Admin-Key": key },
      body: new URLSearchParams({ invoice, iduser: String(session.userId) }),
    });
    const json = await res.json();
    if (Number(json.value) !== 200) {
      redirect(`/admin/verifikasi-adopsi-mitra?error=${encodeURIComponent(json.pesan ?? "Gagal memverifikasi.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/verifikasi-adopsi-mitra?error=Gagal+menghubungi+server");
  }

  revalidatePath("/admin/verifikasi-adopsi-mitra");
  redirect("/admin/verifikasi-adopsi-mitra?verified=1");
}
