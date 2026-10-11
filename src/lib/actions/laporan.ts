"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import { apiGet, apiPost, apiPostForm, mapLaporans, LAPORAN_JENIS, type ApiLaporan } from "@/lib/api";
import { MAX_UPLOAD_BYTES } from "@/lib/file-guard";
import type { AdminState } from "@/lib/actions/admin";

const JENIS_KEYS = new Set(LAPORAN_JENIS.map((j) => j.key));

// Endpoint laporan flat tanpa auth — kepemilikan ditegakkan di web:
// petugas (level 2) hanya boleh mengubah laporan miliknya sendiri.
async function laporanMilik(id: number): Promise<{ laporan?: ApiLaporan; boleh: boolean }> {
  const session = await requireAdmin();
  const rows = mapLaporans(await apiGet<Record<string, unknown>[]>(`laporanlist?id=${id}`));
  const laporan = rows[0];
  if (!laporan) return { boleh: false };
  const boleh = (session.level ?? 1) === 1 || laporan.idpetugas === session.userId;
  return { laporan, boleh };
}

export async function createLaporan(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const session = await requireAdmin();

  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "").trim() || "lainnya";
  if (!judul || !isi || !tanggal) {
    return { error: "Judul, tanggal, dan uraian kegiatan wajib diisi." };
  }
  if (!JENIS_KEYS.has(jenis)) return { error: "Jenis kegiatan tidak valid." };

  let id: number | null = null;
  try {
    const res = await apiPost<{ value?: string | number; pesan?: string; id?: number }>(
      "tambahlaporan",
      {
        idpetugas: session.userId,
        judul,
        jenis,
        desa: String(formData.get("desa") ?? "").trim(),
        tanggal,
        isi,
      },
    );
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menambah laporan." };
    }
    id = Number(res.id) || null;
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    return { error: e instanceof Error && e.message ? e.message : "Gagal menambah laporan." };
  }

  revalidatePath("/admin/laporan");
  redirect(id ? `/admin/laporan/${id}/edit?created=1` : "/admin/laporan?saved=1");
}

export async function updateLaporan(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "Laporan tidak ditemukan." };

  const { laporan, boleh } = await laporanMilik(id);
  if (!laporan) return { error: "Laporan tidak ditemukan." };
  if (!boleh) return { error: "Anda hanya bisa mengubah laporan milik sendiri." };

  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "").trim() || "lainnya";
  if (!judul || !isi || !tanggal) {
    return { error: "Judul, tanggal, dan uraian kegiatan wajib diisi." };
  }
  if (!JENIS_KEYS.has(jenis)) return { error: "Jenis kegiatan tidak valid." };

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editlaporan", {
      id,
      judul,
      jenis,
      desa: String(formData.get("desa") ?? "").trim(),
      tanggal,
      isi,
    });
    if (Number(res.value) !== 200) {
      return { error: res.pesan ?? "Gagal menyimpan laporan." };
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    return { error: e instanceof Error && e.message ? e.message : "Gagal menyimpan laporan." };
  }

  revalidatePath("/admin/laporan");
  redirect(`/admin/laporan/${id}/edit?saved=1`);
}

export async function deleteLaporan(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/laporan?error=Laporan+tidak+ditemukan");

  const { boleh } = await laporanMilik(id).catch(() => ({ boleh: false }));
  if (!boleh) redirect("/admin/laporan?error=Anda+hanya+bisa+menghapus+laporan+milik+sendiri");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuslaporan", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/laporan?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus laporan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/laporan?error=Gagal+menghapus+laporan");
  }

  revalidatePath("/admin/laporan");
  redirect("/admin/laporan?deleted=1");
}

export async function uploadLaporanFoto(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const id = Number(formData.get("idlaporan"));
  if (!id) return { error: "Laporan tidak ditemukan." };

  const { boleh } = await laporanMilik(id).catch(() => ({ boleh: false }));
  if (!boleh) return { error: "Anda hanya bisa mengunggah foto ke laporan milik sendiri." };

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih foto terlebih dahulu." };
  if (!file.type.startsWith("image/")) return { error: "File harus berupa gambar." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Ukuran foto maksimal 2MB." };

  const fd = new FormData();
  fd.append("idlaporan", String(id));
  fd.append("foto", file);

  let res: { value?: string | number; pesan?: string };
  try {
    res = await apiPostForm<{ value?: string | number; pesan?: string }>("uploadlaporanfoto", fd);
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : "Gagal mengunggah foto." };
  }
  if (Number(res.value) !== 200) {
    return { error: res.pesan ?? "Gagal mengunggah foto." };
  }

  revalidatePath(`/admin/laporan/${id}/edit`);
  revalidatePath("/admin/laporan");
  return { saved: true };
}

export async function deleteLaporanFoto(formData: FormData) {
  const id = Number(formData.get("id"));
  const idlaporan = Number(formData.get("idlaporan"));
  if (!idlaporan) redirect("/admin/laporan?error=Laporan+tidak+ditemukan");

  const { boleh } = await laporanMilik(idlaporan).catch(() => ({ boleh: false }));
  if (!boleh) redirect("/admin/laporan?error=Anda+hanya+bisa+mengubah+laporan+milik+sendiri");

  if (id) {
    try {
      const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuslaporanfoto", {
        id,
      });
      if (Number(res.value) !== 200) {
        redirect(
          `/admin/laporan/${idlaporan}/edit?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus foto.")}`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      redirect(`/admin/laporan/${idlaporan}/edit?error=Gagal+menghapus+foto`);
    }
  }

  revalidatePath(`/admin/laporan/${idlaporan}/edit`);
  revalidatePath("/admin/laporan");
  redirect(`/admin/laporan/${idlaporan}/edit?hapus=1`);
}
