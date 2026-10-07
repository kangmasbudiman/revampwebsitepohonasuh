"use server";

import { apiPost } from "@/lib/api";
import { requireUser } from "@/lib/guard";

type GiftResponse = { value?: string | number; pesan?: string };

export type GiftEmailState = { ok?: boolean; pesan?: string };

// Kirim email sertifikat hadiah ke penerima (endpoint fail-soft: bila SMTP
// belum dikonfigurasi, backend membalas value 500 + pesan utk ditampilkan).
export async function kirimSertifikatEmail(
  _prev: GiftEmailState,
  formData: FormData,
): Promise<GiftEmailState> {
  await requireUser();

  const certnum = String(formData.get("certnum") ?? "");
  const toEmail = String(formData.get("to_email") ?? "").trim();
  const toName = String(formData.get("to_name") ?? "").trim();
  const link = String(formData.get("link") ?? "");

  if (!certnum) return { ok: false, pesan: "Sertifikat belum terbit." };
  if (!toEmail) return { ok: false, pesan: "Alamat email penerima wajib diisi." };

  let res: GiftResponse;
  try {
    res = await apiPost<GiftResponse>("kirimemailsertifikat", {
      certnum,
      to_email: toEmail,
      to_name: toName,
      link,
    });
  } catch {
    return { ok: false, pesan: "Tidak dapat menghubungi server. Coba lagi sebentar." };
  }
  if (String(res.value) !== "200") {
    return { ok: false, pesan: res.pesan ?? "Email gagal terkirim." };
  }
  return { ok: true, pesan: res.pesan ?? "Terkirim" };
}
