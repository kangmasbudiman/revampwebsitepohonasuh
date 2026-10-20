"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import {
  apiAssetUrl,
  apiGet,
  apiPost,
  apiPostForm,
  mapLaporanDetail,
  mapLaporans,
  LAPORAN_JENIS,
  type ApiLaporan,
} from "@/lib/api";
import { MAX_UPLOAD_BYTES } from "@/lib/file-guard";

const JENIS_KEYS = new Set(LAPORAN_JENIS.map((j) => j.key));

export type SimpanResult = { ok: boolean; id?: number; error?: string };
export type FotoResult = { ok: boolean; error?: string };

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

// Simpan laporan (buat baru bila tanpa id) — dipanggil imperatif dari form
// step-by-step; foto bertahap diunggah TERPISAH per file lewat unggahFotoLaporan
// setelah baris laporan ada (jaga body server action < 3MB).
export async function simpanLaporan(formData: FormData): Promise<SimpanResult> {
  const session = await requireAdmin();

  const id = Number(formData.get("id")) || null;
  const statusRaw = String(formData.get("status") ?? "");
  const status = ["draft", "terkirim", "disetujui"].includes(statusRaw) ? statusRaw : "terkirim";
  if (status === "disetujui" && (session.level ?? 1) !== 1) {
    return { ok: false, error: "Hanya admin yang bisa menyetujui laporan." };
  }
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const tanggalSelesai = String(formData.get("tanggal_selesai") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "").trim() || "lainnya";
  const desa = String(formData.get("desa") ?? "").trim();
  const dana = String(formData.get("dana") ?? "").replace(/[^\d]/g, "");
  const hasil = String(formData.get("hasil") ?? "").trim();
  const jabatan = String(formData.get("jabatan") ?? "").trim();
  const tempat = String(formData.get("tempat") ?? "").trim();
  const timTagging = String(formData.get("tim_tagging") ?? "").trim();
  const rekeningAt = String(formData.get("rekening_at") ?? "").trim();
  const rekeningBank = String(formData.get("rekening_bank") ?? "").trim();
  const rekeningNorek = String(formData.get("rekening_norek") ?? "").trim();

  if (!JENIS_KEYS.has(jenis)) return { ok: false, error: "Jenis kegiatan tidak valid." };
  if (status !== "draft" && (!judul || !isi || !tanggal)) {
    return { ok: false, error: "Nama kegiatan, tanggal, dan uraian wajib diisi sebelum dikirim." };
  }
  if (status !== "draft" && !dana) {
    return { ok: false, error: "Isi dana yang digunakan sebelum mengirim laporan." };
  }
  if (status !== "draft" && !hasil) {
    return { ok: false, error: "Isi hasil atau manfaat kegiatan sebelum mengirim laporan." };
  }

  const payload: Record<string, string | number> = {
    judul,
    jenis,
    desa,
    tanggal,
    tanggal_selesai: tanggalSelesai,
    jabatan,
    tempat,
    tim_tagging: timTagging,
    rekening_at: rekeningAt,
    rekening_bank: rekeningBank,
    rekening_norek: rekeningNorek,
    isi,
    dana,
    hasil,
    status,
  };

  try {
    if (id) {
      const { laporan, boleh } = await laporanMilik(id);
      if (!laporan) return { ok: false, error: "Laporan tidak ditemukan." };
      if (!boleh) return { ok: false, error: "Anda hanya bisa mengubah laporan milik sendiri." };
      if (jenis === "tagging" && status !== "draft") {
        try {
          const detail = await apiGet<{ pohon?: { jml_foto?: number }[] }>(`laporandetail?id=${id}`);
          const pohon = detail.pohon ?? [];
          const tanpaFoto = pohon.filter((p) => Number(p.jml_foto ?? 0) === 0);
          // Legacy: laporan lama berfoto manual (seluruh pohonnya memang tanpa
          // foto tagging) tetap boleh dikirim ulang.
          const legacy = tanpaFoto.length === pohon.length && (laporan.foto?.length ?? 0) > 0;
          if (!legacy && tanpaFoto.length > 0) {
            return {
              ok: false,
              error: `Ada ${tanpaFoto.length} pohon belum punya foto tagging — unggah fotonya per kode pohon di menu Order Tagging sebelum mengirim.`,
            };
          }
        } catch {
          // detail tak terbaca — lanjut, guard backend jadi lapis berikutnya
        }
      }
      const res = await apiPost<{ value?: string | number; pesan?: string }>("editlaporan", {
        id,
        oleh: session.userId,
        ...payload,
      });
      if (Number(res.value) !== 200) {
        return { ok: false, error: res.pesan ?? "Gagal menyimpan laporan." };
      }
      revalidatePath("/admin/laporan");
      revalidatePath(`/admin/laporan/${id}/edit`);
      return { ok: true, id };
    }
    const res = await apiPost<{ value?: string | number; pesan?: string; id?: number }>(
      "tambahlaporan",
      { idpetugas: session.userId, ...payload },
    );
    if (Number(res.value) !== 200) {
      return { ok: false, error: res.pesan ?? "Gagal menambah laporan." };
    }
    const baru = Number(res.id) || null;
    revalidatePath("/admin/laporan");
    return { ok: true, id: baru ?? undefined };
  } catch {
    return { ok: false, error: "Gagal menyimpan laporan. Coba lagi." };
  }
}

// Buat DRAF Laporan Kegiatan (jenis tagging) dari seleksi pohon di menu
// Order Tagging — draft menjadi "daftar pohon akan ditagging"; foto per
// kode pohon diunggah di Order Tagging, BTOR dilengkapi di form edit.
export async function buatLaporanDariTagging(formData: FormData) {
  const session = await requireAdmin();
  const ids = formData
    .getAll("idadopsi[]")
    .map((v) => Number(v))
    .filter((v) => v > 0);
  if (!ids.length) redirect("/admin/tagging?error=Pilih+minimal+satu+pohon");

  const desaList = formData
    .getAll("desa[]")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const desa = desaList.sort(
    (a, b) => desaList.filter((v) => v === b).length - desaList.filter((v) => v === a).length,
  )[0];
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const judul = `Kegiatan Tagging — ${desa || "Pohon Asuh"} (${stamp})`;

  let id = 0;
  try {
    const res = await apiPost<{ value?: string | number; pesan?: string; id?: number }>(
      "tambahlaporan",
      {
        idpetugas: session.userId,
        judul,
        jenis: "tagging",
        desa,
        tanggal: now.toISOString().slice(0, 10),
        tanggal_selesai: "",
        jabatan: "",
        tempat: "",
        tim_tagging: "",
        rekening_at: "",
        rekening_bank: "",
        rekening_norek: "",
        isi: "",
        dana: "0",
        hasil: "",
        status: "draft",
      },
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/tagging?error=${encodeURIComponent(res.pesan ?? "Gagal membuat laporan.")}`);
    }
    id = Number(res.id) || 0;
    if (!id) redirect("/admin/tagging?error=Gagal+membuat+laporan");

    const fd = new FormData();
    fd.append("idlaporan", String(id));
    for (const idadopsi of ids) fd.append("idadopsi[]", String(idadopsi));
    const set = await apiPostForm<{ value?: string | number; pesan?: string }>(
      "setpohonlaporan",
      fd,
    );
    if (Number(set.value) !== 200) {
      redirect(
        `/admin/tagging?error=${encodeURIComponent(set.pesan ?? "Gagal menyimpan daftar pohon.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+membuat+laporan");
  }

  revalidatePath("/admin/laporan");
  redirect(`/admin/laporan/${id}/edit?created=1`);
}

export async function unggahFotoLaporan(idlaporan: number, file: File): Promise<FotoResult> {
  if (!idlaporan) return { ok: false, error: "Laporan tidak ditemukan." };
  const { boleh } = await laporanMilik(idlaporan).catch(() => ({ boleh: false }));
  if (!boleh) return { ok: false, error: "Anda hanya bisa mengunggah foto ke laporan milik sendiri." };
  if (file.size === 0) return { ok: false, error: "File foto kosong." };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return { ok: false, error: `${file.name}: format harus JPG, PNG, atau WEBP.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `${file.name}: melebihi 2MB.` };
  }

  const fd = new FormData();
  fd.append("idlaporan", String(idlaporan));
  fd.append("foto", file);
  try {
    const res = await apiPostForm<{ value?: string | number; pesan?: string }>(
      "uploadlaporanfoto",
      fd,
    );
    if (Number(res.value) !== 200) {
      return { ok: false, error: res.pesan ?? `Gagal mengunggah ${file.name}.` };
    }
  } catch {
    return { ok: false, error: `Gagal mengunggah ${file.name}.` };
  }
  revalidatePath(`/admin/laporan/${idlaporan}/edit`);
  revalidatePath("/admin/laporan");
  return { ok: true };
}

export async function hapusFotoLaporan(id: number, idlaporan: number): Promise<FotoResult> {
  if (!idlaporan || !id) return { ok: false, error: "Foto tidak ditemukan." };
  const { boleh } = await laporanMilik(idlaporan).catch(() => ({ boleh: false }));
  if (!boleh) return { ok: false, error: "Anda hanya bisa mengubah laporan milik sendiri." };
  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("hapuslaporanfoto", {
      id,
    });
    if (Number(res.value) !== 200) {
      return { ok: false, error: res.pesan ?? "Gagal menghapus foto." };
    }
  } catch {
    return { ok: false, error: "Gagal menghapus foto." };
  }
  revalidatePath(`/admin/laporan/${idlaporan}/edit`);
  revalidatePath("/admin/laporan");
  return { ok: true };
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

// Setujui laporan (admin saja) — tombol cepat di daftar.
export async function approveLaporan(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/laporan?error=Laporan+tidak+ditemukan");

  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect("/admin/laporan?error=Hanya+admin+yang+bisa+menyetujui+laporan");
  }

  // apiPost melempar generik pada HTTP 400, jadi kelengkapan dicek dulu di sini
  // agar pesan banner spesifik (guard backend tetap jadi lapis terakhir).
  const { laporan } = await laporanMilik(id).catch(() => ({ laporan: undefined }));
  if (!laporan) redirect("/admin/laporan?error=Laporan+tidak+ditemukan");
  if (!laporan.judul.trim() || !laporan.isi.trim() || !laporan.tanggal) {
    redirect(
      `/admin/laporan?error=${encodeURIComponent(
        "Laporan belum lengkap — nama kegiatan, tanggal, dan uraian wajib diisi",
      )}`,
    );
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("approvelaporan", {
      id,
      oleh: session.userId,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/laporan?error=${encodeURIComponent(res.pesan ?? "Gagal menyetujui laporan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/laporan?error=Gagal+menyetujui+laporan");
  }

  revalidatePath("/admin/laporan");
  revalidatePath(`/admin/laporan/${id}/edit`);
  redirect(`/admin/laporan/${id}?diverifikasi=1`);
}

// Minta revisi laporan terkirim (admin saja) — kembali ke petugas dengan
// catatan apa yang harus diperbaiki.
export async function revisiLaporan(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/laporan?error=Laporan+tidak+ditemukan");

  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect("/admin/laporan?error=Hanya+admin+yang+bisa+meminta+revisi");
  }
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!catatan) {
    redirect(`/admin/laporan/${id}?error=${encodeURIComponent("Catatan revisi wajib diisi.")}`);
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("revisilaporan", {
      id,
      catatan,
      oleh: session.userId,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/laporan/${id}?error=${encodeURIComponent(res.pesan ?? "Gagal meminta revisi.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/laporan/${id}?error=Gagal+meminta+revisi`);
  }

  revalidatePath("/admin/laporan");
  revalidatePath(`/admin/laporan/${id}`);
  redirect(`/admin/laporan/${id}?revisi=1`);
}

// Simpan daftar pohon hasil tagging milik laporan (replace-set). Dipanggil
// imperatif dari pohon picker setelah baris laporan ada (pola foto).
export async function simpanPohonLaporan(
  idlaporan: number,
  idadopsi: number[],
): Promise<FotoResult> {
  if (!idlaporan) return { ok: false, error: "Laporan tidak ditemukan." };
  const { laporan, boleh } = await laporanMilik(idlaporan).catch(() => ({ laporan: undefined, boleh: false }));
  if (!laporan) return { ok: false, error: "Laporan tidak ditemukan." };
  if (!boleh) return { ok: false, error: "Anda hanya bisa mengubah laporan milik sendiri." };
  if (laporan.status === "disetujui") {
    return { ok: false, error: "Laporan sudah diverifikasi — daftar pohon tidak bisa diubah." };
  }

  const fd = new FormData();
  fd.append("idlaporan", String(idlaporan));
  for (const id of idadopsi) fd.append("idadopsi[]", String(id));
  try {
    const res = await apiPostForm<{ value?: string | number; pesan?: string }>("setpohonlaporan", fd);
    if (Number(res.value) !== 200) {
      return { ok: false, error: res.pesan ?? "Gagal menyimpan daftar pohon." };
    }
  } catch {
    return { ok: false, error: "Gagal menyimpan daftar pohon. Coba lagi." };
  }
  revalidatePath("/admin/laporan");
  revalidatePath(`/admin/laporan/${idlaporan}`);
  revalidatePath(`/admin/laporan/${idlaporan}/edit`);
  return { ok: true };
}

// Foto hasil tagging satu pohon (endpoint lihatfototaging, query per
// idpohon → seluruh riwayat foto pohon). Dipanggil lazy dari halaman
// detail saat galeri pohon dibuka.
export async function ambilFotoTaggingPohon(
  idpohon: string,
): Promise<{ ok: boolean; foto?: { id: number; url: string }[]; error?: string }> {
  await requireAdmin();
  try {
    const fd = new FormData();
    fd.append("idpohon", idpohon);
    const rows = await apiPostForm<{ urlGambar?: string }[]>("lihatfototaging", fd);
    const foto = rows
      .map((r, i) => ({ id: i + 1, url: String(r.urlGambar ?? "").trim() }))
      .filter((f) => f.url !== "");
    return { ok: true, foto };
  } catch {
    return { ok: false, error: "Gagal memuat foto tagging. Coba lagi." };
  }
}

// Lampiran otomatis BTOR jenis tagging: foto hasil tagging per pohon
// terpilih (scope siklus order via fototagingorder), maks 3 foto per pohon
// demi ukuran PDF. Dipanggil lazy dari tombol PDF di detail maupun tabel.
export async function ambilLampiranTagging(
  idlaporan: number,
): Promise<{ ok: boolean; lampiran?: { idpohon: string; foto: string[] }[] }> {
  await requireAdmin();
  try {
    const detail = mapLaporanDetail(
      await apiGet<Record<string, unknown>>(`laporandetail?id=${idlaporan}`),
    );
    const pohon = detail.pohon ?? [];
    const lampiran: { idpohon: string; foto: string[] }[] = [];
    await Promise.all(
      [...new Set(pohon.map((p) => p.invoice).filter(Boolean))].map(async (inv) => {
        try {
          const rows = await apiPost<
            { idadopsi?: number | string; foto?: { url?: string }[] }[]
          >("fototagingorder", { invoice: inv });
          for (const r of rows) {
            const p = pohon.find((x) => x.idadopsi === Number(r.idadopsi));
            if (!p) continue;
            const foto = (r.foto ?? [])
              .map((f) => apiAssetUrl(f.url) ?? "")
              .filter(Boolean)
              .slice(0, 3);
            if (foto.length) lampiran.push({ idpohon: p.idpohon, foto });
          }
        } catch {
          // pohon tanpa lampiran foto
        }
      }),
    );
    lampiran.sort((a, b) => a.idpohon.localeCompare(b.idpohon));
    return { ok: true, lampiran };
  } catch {
    return { ok: false };
  }
}

// Terbitkan / perbarui Memo Pencairan (admin saja) — hanya untuk laporan
// yang BTOR-nya sudah diverifikasi.
export async function simpanMemo(formData: FormData) {
  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect("/admin/laporan?error=Hanya+admin+yang+bisa+menerbitkan+memo");
  }
  const id = Number(formData.get("idlaporan"));
  const memoId = Number(formData.get("id_memo")) || null;
  if (!id) redirect("/admin/laporan?error=Laporan+tidak+ditemukan");

  const { laporan } = await laporanMilik(id).catch(() => ({ laporan: undefined }));
  if (!laporan) redirect(`/admin/laporan/${id}?error=Laporan+tidak+ditemukan`);
  if (laporan.status !== "disetujui") {
    redirect(`/admin/laporan/${id}?error=${encodeURIComponent("BTOR harus diverifikasi dulu sebelum memo diterbitkan.")}`);
  }

  const jumlah = String(formData.get("jumlah") ?? "").replace(/[^\d]/g, "");
  const penerima = String(formData.get("penerima") ?? "").trim();
  if (!jumlah || !penerima) {
    redirect(`/admin/laporan/${id}?error=${encodeURIComponent("Jumlah dana dan penerima wajib diisi.")}`);
  }

  const payload = {
    tanggal: String(formData.get("tanggal") ?? "").trim(),
    jumlah,
    penerima,
    bank: String(formData.get("bank") ?? "").trim(),
    norek: String(formData.get("norek") ?? "").trim(),
    keperluan: String(formData.get("keperluan") ?? "").trim(),
    ttd_nama: String(formData.get("ttd_nama") ?? "").trim(),
    ttd_jabatan: String(formData.get("ttd_jabatan") ?? "").trim(),
    catatan_pencairan: String(formData.get("catatan_pencairan") ?? "").trim(),
    oleh: session.userId,
  };

  try {
    const res = memoId
      ? await apiPost<{ value?: string | number; pesan?: string }>("editmemo", { id: memoId, ...payload })
      : await apiPost<{ value?: string | number; pesan?: string }>("tambahmemo", { idlaporan: id, ...payload });
    if (Number(res.value) !== 200) {
      redirect(`/admin/laporan/${id}?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan memo.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/laporan/${id}?error=Gagal+menyimpan+memo`);
  }

  revalidatePath("/admin/laporan");
  revalidatePath(`/admin/laporan/${id}`);
  redirect(`/admin/laporan/${id}?memo=1`);
}

// Perbarui status pencairan dana memo (admin saja).
export async function updatePencairan(formData: FormData) {
  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect("/admin/laporan?error=Hanya+admin+yang+bisa+memperbarui+pencairan");
  }
  const idlaporan = Number(formData.get("idlaporan"));
  const idMemo = Number(formData.get("id_memo"));
  const status = String(formData.get("status_pencairan") ?? "").trim();
  if (!idlaporan || !idMemo || !["menunggu", "diproses", "dicairkan"].includes(status)) {
    redirect(`/admin/laporan/${idlaporan || ""}?error=Status+pencairan+tidak+valid`);
  }

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("editmemo", {
      id: idMemo,
      status_pencairan: status,
      catatan_pencairan: String(formData.get("catatan_pencairan") ?? "").trim(),
      oleh: session.userId,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/laporan/${idlaporan}?error=${encodeURIComponent(res.pesan ?? "Gagal memperbarui pencairan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/laporan/${idlaporan}?error=Gagal+memperbarui+pencairan`);
  }

  revalidatePath("/admin/laporan");
  revalidatePath(`/admin/laporan/${idlaporan}`);
  redirect(`/admin/laporan/${idlaporan}?pencairan=1`);
}
