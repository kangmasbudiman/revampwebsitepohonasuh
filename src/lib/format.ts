// Nama desa di DB lama tersimpan huruf kecil semua ("rantaukermas");
// tampilkan dengan huruf awal kapital per kata. Bila admin mengisi nama
// dengan huruf kapital sendiri (mis. "KBKA"), hormati input apa adanya.
export function namaDesa(name: string | null | undefined): string {
  const s = (name ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  if (s !== s.toLowerCase()) return s;
  return s.replace(/(^|[\s\-'])\p{L}/gu, (c) => c.toUpperCase());
}

// Nama tampilan lokasi di situs publik: "Label Tampilan" yang diisi admin
// bila ada, selain itu nama desa Title Case.
export function labelLokasi(d: { label?: string | null; name: string }): string {
  const s = (d.label ?? "").trim().replace(/\s+/g, " ");
  return s || namaDesa(d.name);
}

export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function tanggal(value: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

// Label metode pembayaran dari kolom confirmation.methode ("Transfer",
// "Mayar", nama bank, "Cash") untuk ditampilkan di receipt.
export function metodeBayar(m: string, en = false): string {
  const v = m.trim().toLowerCase();
  if (v === "transfer") return en ? "Bank Transfer" : "Transfer Bank";
  if (v === "mayar") return en ? "Online Payment (Mayar)" : "Bayar Online (Mayar)";
  return m.trim() || "-";
}

export const ADOPTION_STATUS: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: "Menunggu Pembayaran",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  PENDING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  ACTIVE: {
    label: "Aktif",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-zinc-100 text-zinc-600 dark:bg-night-700 dark:text-zinc-300",
  },
};

export const TREE_STATUS: Record<string, { label: string; className: string }> = {
  AVAILABLE: {
    label: "Tersedia",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  RESERVED: {
    label: "Dipesan",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  ADOPTED: {
    label: "Teradopsi",
    className: "bg-zinc-100 text-zinc-600 dark:bg-night-700 dark:text-zinc-300",
  },
};
