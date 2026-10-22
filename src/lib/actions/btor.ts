"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import {
  apiGet,
  apiPostFormLax,
  mapBtors,
  mapBtorKandidats,
  type ApiBtor,
} from "@/lib/api";
import { bolehMemo } from "@/lib/hak";

export type BtorResult = { ok: boolean; id?: number; error?: string };

// Endpoint btor flat tanpa auth — kepemilikan ditegakkan di web: petugas
// (level 2) hanya boleh mengubah BTOR miliknya sendiri; memo & pencairan
// khusus role ber-izin memo, admin tanpa izin pun ditolak (lihat hak.ts;
// backend memverifikasi izin segar dari DB).
async function btorMilik(id: number): Promise<{ btor?: ApiBtor; boleh: boolean }> {
  const session = await requireAdmin();
  const rows = mapBtors(await apiGet<Record<string, unknown>[]>(`btorlist?id=${id}`));
  const btor = rows[0];
  if (!btor) return { boleh: false };
  const boleh = (session.level ?? 1) === 1 || btor.idpetugas === session.userId;
  return { btor, boleh };
}

// Kandidat order tagging selesai di satu desa untuk seorang petugas —
// dipakai form BTOR (checklist order) saat buat/edit. Saat edit, order
// milik BTOR itu sendiri tetap tampil (idbtor dikecualikan dari filter).
export async function ambilBtorKandidat(
  idpetugas: number,
  iddesa: number,
  idbtor = 0,
): Promise<BtorResult & { kandidat?: ReturnType<typeof mapBtorKandidats> }> {
  await requireAdmin();
  try {
    const rows = await apiGet<Record<string, unknown>[]>(
      `btororderkandidat?idpetugas=${idpetugas}&iddesa=${iddesa}${idbtor ? `&idbtor=${idbtor}` : ""}`,
    );
    return { ok: true, kandidat: mapBtorKandidats(rows) };
  } catch {
    return { ok: false, error: "Gagal memuat order selesai. Coba lagi." };
  }
}

// Simpan BTOR (buat baru bila tanpa id) — dipanggil imperatif dari form
// step-by-step. idorder[] = checklist order tagging selesai (replace-set).
export async function simpanBtor(formData: FormData): Promise<BtorResult> {
  const session = await requireAdmin();

  const id = Number(formData.get("id")) || null;
  const statusRaw = String(formData.get("status") ?? "");
  const status = ["draft", "terkirim"].includes(statusRaw) ? statusRaw : "terkirim";
  let idpetugas = Number(formData.get("idpetugas")) || 0;
  if ((session.level ?? 1) !== 1) idpetugas = session.userId;
  const iddesa = Number(formData.get("iddesa")) || 0;
  const idorder = formData
    .getAll("idorder[]")
    .map((v) => Number(v))
    .filter((v) => v > 0);
  const dana = String(formData.get("dana") ?? "").replace(/[^\d]/g, "");
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();

  if (!idpetugas || !iddesa) return { ok: false, error: "Petugas dan desa wajib dipilih." };
  if (status === "terkirim") {
    if (!judul || !isi) {
      return { ok: false, error: "Judul dan catatan kegiatan wajib diisi sebelum dikirim." };
    }
    if (!idorder.length) {
      return { ok: false, error: "Pilih minimal satu order tagging selesai." };
    }
    if (!dana) {
      return { ok: false, error: "Isi dana yang digunakan sebelum mengirim BTOR." };
    }
  }

  if (id) {
    const { btor, boleh } = await btorMilik(id);
    if (!btor) return { ok: false, error: "BTOR tidak ditemukan." };
    if (!boleh) return { ok: false, error: "Anda hanya bisa mengubah BTOR milik sendiri." };
    if (!["draft", "revisi"].includes(btor.status)) {
      return { ok: false, error: "BTOR yang sudah terkirim/disetujui tidak bisa diubah." };
    }
  }

  const fd = new FormData();
  if (id) fd.append("id", String(id));
  fd.append("idpetugas", String(idpetugas));
  fd.append("iddesa", String(iddesa));
  fd.append("judul", judul);
  fd.append("tanggal", String(formData.get("tanggal") ?? "").trim());
  fd.append("tanggal_selesai", String(formData.get("tanggal_selesai") ?? "").trim());
  fd.append("isi", isi);
  fd.append("dana", dana);
  fd.append("hasil", String(formData.get("hasil") ?? "").trim());
  fd.append("jabatan", String(formData.get("jabatan") ?? "").trim());
  fd.append("tim_tagging", String(formData.get("tim_tagging") ?? "").trim());
  fd.append("rekening_at", String(formData.get("rekening_at") ?? "").trim());
  fd.append("rekening_bank", String(formData.get("rekening_bank") ?? "").trim());
  fd.append("rekening_norek", String(formData.get("rekening_norek") ?? "").trim());
  fd.append("status", status);
  for (const v of idorder) fd.append("idorder[]", String(v));
  fd.append("oleh", String(session.userId));

  try {
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string; id?: number }>(
      id ? "editbtor" : "tambahbtor",
      fd,
    );
    if (Number(res.value) !== 200) {
      return { ok: false, error: res.pesan ?? "Gagal menyimpan BTOR." };
    }
    const baru = Number(res.id) || id || 0;
    revalidatePath("/admin/btor");
    if (baru) revalidatePath(`/admin/btor/${baru}`);
    return { ok: true, id: baru || undefined };
  } catch {
    return { ok: false, error: "Gagal menyimpan BTOR. Coba lagi." };
  }
}

export async function hapusBtor(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/btor?error=BTOR+tidak+ditemukan");

  const { boleh } = await btorMilik(id).catch(() => ({ boleh: false }));
  if (!boleh) redirect("/admin/btor?error=Anda+hanya+bisa+menghapus+BTOR+milik+sendiri");

  try {
    const fd = new FormData();
    fd.append("id", String(id));
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string }>("hapusbtor", fd);
    if (Number(res.value) !== 200) {
      redirect(`/admin/btor?error=${encodeURIComponent(res.pesan ?? "Gagal menghapus BTOR.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/btor?error=Gagal+menghapus+BTOR");
  }

  revalidatePath("/admin/btor");
  redirect("/admin/btor?deleted=1");
}

// Setujui BTOR (admin saja) — tahap verifikasi sebelum memo bisa terbit.
export async function approveBtor(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/btor?error=BTOR+tidak+ditemukan");

  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect("/admin/btor?error=Hanya+admin+yang+bisa+menyetujui+BTOR");
  }

  const { btor } = await btorMilik(id).catch(() => ({ btor: undefined }));
  if (!btor) redirect("/admin/btor?error=BTOR+tidak+ditemukan");
  if (!btor.judul.trim() || !btor.isi.trim() || btor.jmlOrder === 0) {
    redirect(
      `/admin/btor/${id}?error=${encodeURIComponent(
        "BTOR belum lengkap — judul, catatan kegiatan, dan minimal satu order wajib ada",
      )}`,
    );
  }
  if (!btor.dana || btor.dana <= 0) {
    redirect(`/admin/btor/${id}?error=${encodeURIComponent("Dana BTOR belum diisi — lengkapi dulu sebelum disetujui.")}`);
  }

  try {
    const fd = new FormData();
    fd.append("id", String(id));
    fd.append("oleh", String(session.userId));
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string }>("approvebtor", fd);
    if (Number(res.value) !== 200) {
      redirect(`/admin/btor/${id}?error=${encodeURIComponent(res.pesan ?? "Gagal menyetujui BTOR.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/btor/${id}?error=Gagal+menyetujui+BTOR`);
  }

  revalidatePath("/admin/btor");
  revalidatePath(`/admin/btor/${id}`);
  redirect(`/admin/btor/${id}?diverifikasi=1`);
}

// Minta revisi BTOR terkirim (admin saja) — kembali ke petugas dengan
// catatan apa yang harus diperbaiki.
export async function revisiBtor(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/btor?error=BTOR+tidak+ditemukan");

  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect("/admin/btor?error=Hanya+admin+yang+bisa+meminta+revisi");
  }
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!catatan) {
    redirect(`/admin/btor/${id}?error=${encodeURIComponent("Catatan revisi wajib diisi.")}`);
  }

  try {
    const fd = new FormData();
    fd.append("id", String(id));
    fd.append("catatan", catatan);
    fd.append("oleh", String(session.userId));
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string }>("revisibtor", fd);
    if (Number(res.value) !== 200) {
      redirect(`/admin/btor/${id}?error=${encodeURIComponent(res.pesan ?? "Gagal meminta revisi.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/btor/${id}?error=Gagal+meminta+revisi`);
  }

  revalidatePath("/admin/btor");
  revalidatePath(`/admin/btor/${id}`);
  redirect(`/admin/btor/${id}?revisi=1`);
}

// Terbitkan / perbarui Memo Pencairan BTOR (khusus role ber-izin memo) —
// hanya untuk BTOR yang sudah diverifikasi. Data pencairan otomatis dari
// BTOR; form hanya mengisi bagian memorandum.
export async function simpanMemoBtor(formData: FormData) {
  const session = await requireAdmin();
  if (!bolehMemo(session)) {
    redirect("/admin/btor?error=Tidak+punya+izin+menerbitkan+memo");
  }
  const id = Number(formData.get("idbtor"));
  const memoId = Number(formData.get("id_memo")) || null;
  if (!id) redirect("/admin/btor?error=BTOR+tidak+ditemukan");

  const { btor } = await btorMilik(id).catch(() => ({ btor: undefined }));
  if (!btor) redirect(`/admin/btor/${id}?error=BTOR+tidak+ditemukan`);
  if (btor.status !== "disetujui") {
    redirect(`/admin/btor/${id}?error=${encodeURIComponent("BTOR harus diverifikasi dulu sebelum memo diterbitkan.")}`);
  }

  const dari = String(formData.get("dari") ?? "").trim();
  const kepada = String(formData.get("kepada") ?? "").trim();
  if (!dari || !kepada) {
    redirect(`/admin/btor/${id}?error=${encodeURIComponent("Dari dan Kepada wajib diisi.")}`);
  }
  const dana = btor.dana ?? 0;
  if (dana <= 0) {
    redirect(`/admin/btor/${id}?error=${encodeURIComponent("Dana BTOR belum diisi — lengkapi dulu BTOR-nya.")}`);
  }

  const payload: Record<string, string> = {
    tanggal: String(formData.get("tanggal") ?? "").trim(),
    dari,
    kepada,
    proyek: String(formData.get("proyek") ?? "").trim(),
    isi: String(formData.get("isi") ?? "").trim(),
    jumlah: String(dana),
    penerima: btor.rekeningAt || btor.petugas,
    bank: btor.rekeningBank,
    norek: btor.rekeningNorek,
    keperluan: `Pencairan dana BTOR ${btor.judul}`,
    ttd_nama: String(formData.get("ttd_nama") ?? "").trim(),
    ttd_jabatan: String(formData.get("ttd_jabatan") ?? "").trim(),
    ...(formData.has("catatan_pencairan")
      ? { catatan_pencairan: String(formData.get("catatan_pencairan")).trim() }
      : {}),
    oleh: String(session.userId),
  };

  try {
    const fd = new FormData();
    if (memoId) fd.append("id", String(memoId));
    else fd.append("idbtor", String(id));
    for (const [k, v] of Object.entries(payload)) fd.append(k, v);
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string }>(
      memoId ? "editmemobtor" : "tambahmemobtor",
      fd,
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/btor/${id}?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan memo.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/btor/${id}?error=Gagal+menyimpan+memo`);
  }

  revalidatePath("/admin/btor");
  revalidatePath(`/admin/btor/${id}`);
  redirect(`/admin/btor/${id}?memo=1`);
}

// Perbarui status pencairan dana memo (khusus role ber-izin memo).
export async function updatePencairanBtor(formData: FormData) {
  const session = await requireAdmin();
  if (!bolehMemo(session)) {
    redirect("/admin/btor?error=Tidak+punya+izin+memperbarui+pencairan");
  }
  const idbtor = Number(formData.get("idbtor"));
  const idMemo = Number(formData.get("id_memo"));
  const status = String(formData.get("status_pencairan") ?? "").trim();
  if (!idbtor || !idMemo || !["menunggu", "diproses", "dicairkan"].includes(status)) {
    redirect(`/admin/btor/${idbtor || ""}?error=Status+pencairan+tidak+valid`);
  }

  try {
    const fd = new FormData();
    fd.append("id", String(idMemo));
    fd.append("status_pencairan", status);
    fd.append("catatan_pencairan", String(formData.get("catatan_pencairan") ?? "").trim());
    fd.append("oleh", String(session.userId));
    const res = await apiPostFormLax<{ value?: string | number; pesan?: string }>(
      "editmemobtor",
      fd,
    );
    if (Number(res.value) !== 200) {
      redirect(`/admin/btor/${idbtor}?error=${encodeURIComponent(res.pesan ?? "Gagal memperbarui pencairan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/btor/${idbtor}?error=Gagal+memperbarui+pencairan`);
  }

  revalidatePath("/admin/btor");
  revalidatePath(`/admin/btor/${idbtor}`);
  redirect(`/admin/btor/${idbtor}?pencairan=1`);
}
