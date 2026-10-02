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
