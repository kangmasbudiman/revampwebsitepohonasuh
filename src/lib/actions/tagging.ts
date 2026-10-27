"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import { apiPost, apiPostForm } from "@/lib/api";
import type { AdminState } from "@/lib/actions/admin";

const MAX_FOTO_BYTES = 2 * 1024 * 1024;

export async function uploadTaggingPhoto(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const session = await requireAdmin();

  const idpohon = String(formData.get("idpohon") ?? "").trim();
  const idadopsi = Number(formData.get("idadopsi"));
  if (!idpohon || !idadopsi) return { error: "Order tidak ditemukan." };

  const files = formData
    .getAll("foto")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Pilih foto tagging terlebih dahulu." };
  }

  let ok = 0;
  const gagal: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      gagal.push(`${file.name}: bukan gambar`);
      continue;
    }
    if (file.size > MAX_FOTO_BYTES) {
      gagal.push(`${file.name}: melebihi 2MB`);
      continue;
    }

    const fd = new FormData();
    fd.append("image", file);
    fd.append("idpohon", idpohon);
    fd.append("idadopsi", String(idadopsi));
    fd.append("idmember", String(session.userId));
    fd.append("tanggal", new Date().toISOString().slice(0, 10));

    try {
      const res = await apiPostForm<{ value?: string | number; pesan?: string }>(
        "uploadfototaging",
        fd,
      );
      if (Number(res.value) === 200) ok++;
      else gagal.push(`${file.name}: ${res.pesan ?? "gagal"}`);
    } catch (e) {
      gagal.push(
        `${file.name}: ${e instanceof Error && e.message ? e.message : "gagal"}`,
      );
    }
  }

  revalidatePath("/admin/tagging");
  if (ok === 0) {
    return { error: gagal.join(" · ") || "Gagal mengunggah foto." };
  }
  if (gagal.length > 0) {
    return { saved: true, pesan: `${ok} foto terunggah. Gagal: ${gagal.join(" · ")}` };
  }
  return { saved: true, pesan: `${ok} foto tagging terunggah.` };
}

export async function markInProgress(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/tagging?error=Order+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("updatestatusproses", {
      id,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/tagging?error=${encodeURIComponent(res.pesan ?? "Gagal memproses order.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+memproses+order");
  }

  revalidatePath("/admin/tagging");
  redirect("/admin/tagging?proses=2&mulai=1");
}

// Acc / tolak PERMINTAAN "Mulai Proses" petugas (admin). Acc membuka form
// foto + catatan bagi petugas; tolak mengembalikan order ke daftar Baru.
export async function accTagging(formData: FormData) {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const aksi = String(formData.get("aksi") ?? "") === "tolak" ? "tolak" : "acc";
  if (!id) redirect("/admin/tagging?error=Order+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("acctaging", {
      id,
      oleh: session.userId,
      aksi,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/tagging?error=${encodeURIComponent(res.pesan ?? "Gagal memproses permintaan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+memproses+permintaan");
  }

  revalidatePath("/admin/tagging");
  redirect(`/admin/tagging?proses=2&${aksi === "acc" ? "acc" : "tolak"}=1`);
}

export async function markComplete(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const idpohon = String(formData.get("idpohon") ?? "").trim();
  if (!id || !idpohon) redirect("/admin/tagging?error=Order+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("updatestatuscomplate", {
      id,
      idpohon,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/tagging?error=${encodeURIComponent(res.pesan ?? "Gagal menyelesaikan order.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+menyelesaikan+order");
  }

  revalidatePath("/admin/tagging");
  revalidatePath("/pohon");
  revalidatePath("/dashboard");
  redirect("/admin/tagging?selesai=1");
}

// Batalkan order dari halaman tagging (batalverivication): seluruh pohon
// pada invoice dikembalikan ke available agar bisa diadopsi donor lain,
// data adopsi + foto tagging dihapus, donatur dinotifikasi. Berlaku per
// INVOICE — order multi-pohon ikut terbatalkan sekaligus.
export async function cancelOrder(formData: FormData) {
  const session = await requireAdmin();
  const confirmasiId = Number(formData.get("confirmasiId"));
  if (!confirmasiId) redirect("/admin/tagging?error=Order+tidak+ditemukan");

  try {
    const res = await apiPost<{ code?: number | string; message?: string }>(
      "batalverivication",
      { id: confirmasiId, iduser: session.userId },
    );
    if (Number(res.code) !== 200) {
      redirect(
        `/admin/tagging?error=${encodeURIComponent(res.message ?? "Gagal membatalkan order.")}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+membatalkan+order");
  }

  revalidatePath("/admin/tagging");
  revalidatePath("/admin");
  revalidatePath("/admin/verifikasi");
  revalidatePath("/pohon");
  redirect("/admin/tagging?batal=1");
}

// Batalkan PROSES tagging satu pohon (batalproses) — khusus petugas:
// kebalikan "Mulai Proses", order kembali ke daftar Baru (proses=1) dan
// foto tagging siklus ini dihapus. Order/adopsi TETAP ADA — berbeda dari
// cancelOrder yang membatalkan seluruh order per invoice.
export async function cancelProses(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) redirect("/admin/tagging?error=Order+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("batalproses", { id });
    if (Number(res.value) !== 200) {
      redirect(`/admin/tagging?error=${encodeURIComponent(res.pesan ?? "Gagal membatalkan proses.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+membatalkan+proses");
  }

  revalidatePath("/admin/tagging");
  redirect("/admin/tagging?batalproses=1");
}

// Catatan order tagging (updatenoted): simpan catatan internal per order.
export async function updateOrderNote(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim();
  if (!id) redirect("/admin/tagging?error=Order+tidak+ditemukan");

  try {
    const res = await apiPost<{ value?: string | number; pesan?: string }>("updatenoted", {
      idorder: id,
      note,
    });
    if (Number(res.value) !== 200) {
      redirect(`/admin/tagging?error=${encodeURIComponent(res.pesan ?? "Gagal menyimpan catatan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/tagging?error=Gagal+menyimpan+catatan");
  }

  revalidatePath("/admin/tagging");
  redirect("/admin/tagging?catatan=1");
}
