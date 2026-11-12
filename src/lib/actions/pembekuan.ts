"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guard";
import { apiPostAny } from "@/lib/api";

const BALIK = "/admin/pohon/beku";

// Pengelola desa (member admin=2 yang ditugaskan sebagai admin_desa)
// mengajukan pembekuan pohon di desanya — baru berjalan setelah
// disetujui admin utama (level 1).
export async function ajukanPembekuan(formData: FormData) {
  const session = await requireAdmin();
  const tipe = String(formData.get("tipe") ?? "pohon") === "desa" ? "desa" : "pohon";
  const desa = String(formData.get("desa") ?? "").trim();
  const alasan = String(formData.get("alasan") ?? "").trim();
  const hari = Math.max(0, Math.floor(Number(formData.get("hari") ?? 0)) || 0);
  const codes = formData
    .getAll("idpohon")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!desa) redirect(`${BALIK}?error=${encodeURIComponent("Pilih desa pengajuan.")}`);
  if (!alasan) redirect(`${BALIK}?error=${encodeURIComponent("Alasan pembekuan wajib diisi.")}`);
  if (tipe === "pohon" && codes.length === 0) {
    redirect(`${BALIK}?error=${encodeURIComponent("Pilih minimal satu pohon.")}`);
  }

  try {
    const res = await apiPostAny<{ value?: string | number; pesan?: string }>("ajukanbeku", {
      idmember: session.userId,
      tipe,
      desa,
      idpohon: codes.join(","),
      alasan,
      hari,
    });
    if (Number(res.value) !== 200) {
      redirect(`${BALIK}?error=${encodeURIComponent(res.pesan ?? "Gagal mengirim pengajuan.")}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`${BALIK}?error=Gagal+mengirim+pengajuan`);
  }

  revalidatePath("/admin/pohon/beku");
  redirect(`${BALIK}?diaju=1`);
}

// Admin utama memproses pengajuan: aksi=setuju (pembekuan langsung
// dijalankan) atau aksi=tolak (dengan catatan opsional untuk pengaju).
export async function prosesPengajuan(formData: FormData) {
  const session = await requireAdmin();
  if ((session.level ?? 1) !== 1) {
    redirect(`${BALIK}?error=${encodeURIComponent("Hanya admin utama yang bisa memproses pengajuan.")}`);
  }
  const id = Number(formData.get("id"));
  const aksi = String(formData.get("aksi") ?? "") === "tolak" ? "tolak" : "setuju";
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) redirect(`${BALIK}?error=Pengajuan+tidak+ditemukan`);

  let jumlah = 0;
  try {
    const res = await apiPostAny<{ value?: string | number; pesan?: string; jumlah?: number }>(
      aksi === "tolak" ? "tolakbeku" : "setujuibeku",
      { idadmin: session.userId, id, catatan },
    );
    if (Number(res.value) !== 200) {
      redirect(`${BALIK}?error=${encodeURIComponent(res.pesan ?? "Gagal memproses pengajuan.")}`);
    }
    jumlah = Number(res.jumlah) || 0;
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`${BALIK}?error=Gagal+memproses+pengajuan`);
  }

  revalidatePath("/admin/pohon/beku");
  revalidatePath("/admin/pohon");
  revalidatePath("/pohon");
  redirect(
    aksi === "tolak" ? `${BALIK}?tolak=1` : `${BALIK}?acc=1&jumlah=${jumlah}`,
  );
}
