"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { apiPost, apiPostForm } from "@/lib/api";

export type AdoptionState = { error?: string };
export type UnavailableTree = { code: string; localName: string };
export type CheckoutState = {
  error?: string;
  unavailable?: UnavailableTree[];
  ok?: boolean;
  redirectTo?: string;
};

// Alur adopsi web = alur mobile: tobasket → confirmasipembayaran (order +
// kode unik di price) → uploadbuktitransfer → verivication admin.
//
// Semua harga & ketersediaan divalidasi ulang dari server; kode pohon dari
// klien hanya petunjuk, tidak dipercaya.

type CheckoutItem = {
  code: string;
  years?: number;
  giftName?: string;
  giftNote?: string;
};

type CheckoutResult =
  | { ok: true; id: number; unavailable: UnavailableTree[] }
  | { ok: false; error: string; unavailable: UnavailableTree[] };

function clampYears(v: unknown): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 5);
}

async function checkoutTrees(
  session: { userId: number; name: string },
  items: CheckoutItem[],
): Promise<CheckoutResult> {
  // Satu kode pohon hanya sekali — patch pertama yang menang.
  const byCode = new Map<string, CheckoutItem>();
  for (const it of items) {
    const code = String(it.code ?? "").trim();
    if (code && !byCode.has(code)) byCode.set(code, it);
  }
  if (byCode.size === 0) {
    return { ok: false, error: "Keranjang kosong.", unavailable: [] };
  }

  // confirmasipembayaran menguras SELURUH basket member — kosongkan dulu
  // agar sisa trolley dari app mobile tidak ikut ter-checkout.
  try {
    const trolley = await apiPost<{ id?: number }[]>("mytrolley", {
      idmember: session.userId,
    });
    for (const row of trolley ?? []) {
      if (row?.id) await apiPost("mytrolleydelete", { id: row.id });
    }
  } catch {
    // basket tak terbaca tidak halangan — lanjut validasi pohon
  }

  const unavailable: UnavailableTree[] = [];
  const valid: (CheckoutItem & { harga: number; years: number })[] = [];
  for (const [code, item] of byCode) {
    try {
      const tree = await apiPost<Record<string, unknown> | null>(
        "pohonbykode",
        { idpohon: code },
      );
      const harga = Number(tree?.harga) || 0;
      if (tree && String(tree.adopted) === "available" && harga > 0) {
        valid.push({ ...item, code, harga, years: clampYears(item.years) });
      } else {
        unavailable.push({ code, localName: String(tree?.localname ?? code) });
      }
    } catch {
      unavailable.push({ code, localName: code });
    }
  }
  if (valid.length === 0) {
    return {
      ok: false,
      error: "Tidak ada pohon yang tersedia untuk diadopsi.",
      unavailable,
    };
  }

  for (const t of valid) {
    // nama penerima hadiah (basket.nama) dipakai server sebagai nama di
    // sertifikat; kosong = nama pemesan. pesan → memo sertifikat.
    const basket = await apiPost<{ code?: string | number }>("tobasket", {
      id_pohon: t.code,
      id_member: session.userId,
      years: t.years,
      nama: t.giftName?.trim() || "",
      pesan: t.giftNote?.trim() || "",
    });
    // 205 = sudah ada di basket (duplikat) — anggap sukses
    const c = Number(basket.code);
    if (c !== 200 && c !== 205) {
      return {
        ok: false,
        error: "Gagal menambahkan pohon ke keranjang server. Coba lagi.",
        unavailable,
      };
    }
  }

  const subtotal = valid.reduce((s, t) => s + t.harga * t.years, 0);
  const unique = 100 + Math.floor(Math.random() * 900);

  let email = "";
  try {
    const profil = await apiPost<{ emaile?: string }>("getprofil", {
      id: session.userId,
    });
    email = profil?.emaile ?? "";
  } catch {
    // email kosong tidak menghalangi order
  }

  try {
    const conf = await apiPost<{ code?: string | number; id?: number }>(
      "confirmasipembayaran",
      {
        id_member: session.userId,
        name: session.name,
        email,
        methode: "Transfer",
        price: subtotal + unique,
        jml_pohon: valid.length,
      },
    );
    if (Number(conf.code) !== 200 || !conf.id) {
      return {
        ok: false,
        error: "Gagal membuat order. Coba lagi.",
        unavailable,
      };
    }
    revalidatePath("/pohon");
    revalidatePath("/dashboard");
    return { ok: true, id: conf.id, unavailable };
  } catch {
    return {
      ok: false,
      error: "Gagal membuat order. Coba lagi.",
      unavailable,
    };
  }
}

export async function createAdoption(
  _prev: AdoptionState,
  formData: FormData,
): Promise<AdoptionState> {
  const session = await getSession();
  if (!session) redirect(`/masuk?next=/pohon`);

  const treeCode = String(formData.get("treeCode") ?? "").trim();
  if (!treeCode) return { error: "Pohon tidak valid." };

  const result = await checkoutTrees(session, [
    {
      code: treeCode,
      years: Number(formData.get("years")) || 1,
      giftName: String(formData.get("nama") ?? ""),
      giftNote: String(formData.get("pesan") ?? ""),
    },
  ]);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/pohon/${treeCode}`);
  redirect(`/dashboard/adopsi/${result.id}`);
}

// Checkout keranjang guest (localStorage). codes dikirim klien hanya sebagai
// daftar kode — server memvalidasi ulang semua pohon. Tidak memanggil
// redirect() supaya klien bisa clearCart() sebelum pindah halaman.
export async function checkoutCart(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesi berakhir. Silakan masuk kembali." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Data keranjang tidak valid." };
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Keranjang kosong." };
  }
  // Terima objek lengkap {code, years, giftName, giftNote} maupun legacy
  // array of string (item keranjang lama sebelum fitur durasi).
  const items: CheckoutItem[] = [];
  for (const el of raw) {
    if (typeof el === "string") {
      items.push({ code: el });
    } else if (el && typeof el === "object" && "code" in el) {
      const o = el as Record<string, unknown>;
      items.push({
        code: String(o.code ?? ""),
        years: Number(o.years) || 1,
        giftName: typeof o.giftName === "string" ? o.giftName : "",
        giftNote: typeof o.giftNote === "string" ? o.giftNote : "",
      });
    }
  }
  if (items.length === 0) {
    return { error: "Keranjang kosong." };
  }

  const result = await checkoutTrees(session, items);
  if (!result.ok) {
    return { error: result.error, unavailable: result.unavailable };
  }
  return {
    ok: true,
    redirectTo: `/dashboard/adopsi/${result.id}`,
    unavailable: result.unavailable,
  };
}

export async function submitPayment(
  _prev: AdoptionState,
  formData: FormData,
): Promise<AdoptionState> {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const confirmationId = Number(formData.get("confirmationId"));
  if (!confirmationId) return { error: "Order tidak ditemukan." };

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bukti pembayaran wajib diunggah." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Bukti pembayaran harus berupa gambar." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Ukuran gambar maksimal 2 MB." };
  }

  let konfirmasi: Record<string, unknown>[] = [];
  try {
    konfirmasi = await apiPost<Record<string, unknown>[]>("getconfirmasi", {
      idmember: session.userId,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi." };
  }
  const order = konfirmasi.find((k) => Number(k.id) === confirmationId);
  if (!order) return { error: "Order tidak ditemukan." };
  if (String(order.confirmation) !== "no" || order.foto) {
    return { error: "Pembayaran untuk order ini sudah diproses." };
  }

  const fd = new FormData();
  fd.set("id", String(confirmationId));
  fd.set("image", file);
  try {
    await apiPostForm("uploadbuktitransfer", fd);
  } catch {
    return { error: "Gagal mengunggah bukti. Coba lagi." };
  }

  revalidatePath(`/dashboard/adopsi/${confirmationId}`);
  revalidatePath("/dashboard");
  return {};
}

export type PaymentLinkState = { error?: string; link?: string };

// Buat invoice Mayar untuk order milik sendiri yang belum dibayar.
// Backend idempoten: invoice yang sudah pernah dibuat balas link lama.
export async function createPaymentLink(
  _prev: PaymentLinkState,
  formData: FormData,
): Promise<PaymentLinkState> {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const confirmationId = Number(formData.get("confirmationId"));
  if (!confirmationId) return { error: "Order tidak ditemukan." };

  let konfirmasi: Record<string, unknown>[] = [];
  try {
    konfirmasi = await apiPost<Record<string, unknown>[]>("getconfirmasi", {
      idmember: session.userId,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi." };
  }
  const order = konfirmasi.find((k) => Number(k.id) === confirmationId);
  if (!order) return { error: "Order tidak ditemukan." };
  if (String(order.confirmation) !== "no" || order.foto) {
    return { error: "Pembayaran untuk order ini sudah diproses." };
  }
  if (order.link_invoice) {
    return { link: String(order.link_invoice) };
  }

  let res: { code?: number | string; link?: string; message?: string };
  try {
    res = await apiPost<{ code?: number | string; link?: string; message?: string }>(
      "createinvoice",
      { id: confirmationId },
    );
  } catch {
    return { error: "Gagal membuat tagihan online. Coba lagi." };
  }
  if (Number(res.code) !== 200 || !res.link) {
    if (Number(res.code) === 500) {
      return { error: "Pembayaran online belum tersedia saat ini. Silakan transfer manual." };
    }
    return { error: res.message ?? "Gagal membuat tagihan online. Coba lagi." };
  }

  revalidatePath(`/dashboard/adopsi/${confirmationId}`);
  return { link: res.link };
}

export async function cancelAdoption(
  _prev: AdoptionState,
  formData: FormData,
): Promise<AdoptionState> {
  const session = await getSession();
  if (!session) redirect("/masuk");

  const confirmationId = Number(formData.get("confirmationId"));
  if (!confirmationId) return { error: "Order tidak ditemukan." };

  let konfirmasi: Record<string, unknown>[] = [];
  try {
    konfirmasi = await apiPost<Record<string, unknown>[]>("getconfirmasi", {
      idmember: session.userId,
    });
  } catch {
    return { error: "Gagal menghubungi server. Coba lagi." };
  }
  const order = konfirmasi.find((k) => Number(k.id) === confirmationId);
  if (!order) return { error: "Order tidak ditemukan." };
  if (String(order.confirmation) === "yes") {
    return { error: "Adopsi yang sudah aktif tidak dapat dibatalkan." };
  }

  try {
    await apiPost("hapustransaksitidakjadi", { id: confirmationId });
  } catch {
    return { error: "Gagal membatalkan order. Coba lagi." };
  }

  revalidatePath("/pohon");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
