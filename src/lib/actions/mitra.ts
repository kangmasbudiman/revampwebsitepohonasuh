"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminLevel, requireUser } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";

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
        durasi: String(formData.get("durasi") ?? "").trim(),
        aktif: String(formData.get("aktif") ?? "1"),
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
    redirect("/daftar-mitra?error=Gagal+menghubungi+server");
  }

  redirect("/masuk?terdaftar=1");
}
