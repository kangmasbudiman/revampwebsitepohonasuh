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

// Sebutan unit pemerintahan terkecil: Nagari di Sumatera Barat, Desa di
// provinsi lain (nilai provinsi dari tabel desa).
export function sebutanDesa(provinsi?: string | null): string {
  return /sumatera\s*barat|sumatra\s*barat|west\s*sumatra/i.test(provinsi ?? "")
    ? "Nagari"
    : "Desa";
}

export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

// Budget program yang di-null/0 → "—" (kolom tabel Program Mitra).
export function formatBudget(v: number | null | undefined): string {
  const n = v ? Number(v) : 0;
  if (!n || n <= 0) return "—";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// Penanda masa program: "near" bila berakhir dalam ≤14 hari (belum lewat).
export function infoMasaProgram(tglSelesai?: string | null): { status: "near" | "expired" | "normal"; days: number } {
  if (!tglSelesai) return { status: "normal", days: 0 };
  const end = new Date(`${tglSelesai}T00:00:00`);
  if (Number.isNaN(end.getTime())) return { status: "normal", days: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { status: "expired", days: Math.abs(days) };
  if (days <= 14) return { status: "near", days };
  return { status: "normal", days };
}

// Durasi program ("N bulan N hari" / "N bulan" / "N hari") dari rentang
// tanggal (tgl_mulai → tgl_selesai) — format sama seperti auto-durasi form.
export function durasiDariTanggal(s?: string | null, e?: string | null): string {
  if (!s || !e) return "";
  const a = new Date(`${s}T00:00:00`);
  const b = new Date(`${e}T00:00:00`);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  let days = b.getDate() - a.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
  }
  const mm = Math.max(0, months);
  const dd = Math.max(0, days);
  if (mm > 0 && dd > 0) return `${mm} bulan ${dd} hari`;
  if (mm > 0) return `${mm} bulan`;
  return `${dd} hari`;
}

// Provinsi program (dipisah koma) → "Banten, Jambi" (—" kosong).
export function formatProvinsi(v: string | null | undefined): string {
  const list = String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list.join(", ") : "—";
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
  FROZEN: {
    label: "Pohon Sedang Dibekukan",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
  RESERVED_ADMIN: {
    label: "Dipesan Admin",
    className: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
  },
  MITRA: {
    label: "Dipesan Mitra",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
  },
};

// Status tampilan satu pohon: beku & reservasi admin didahulukan agar badge
// publik/admin konsisten (pohon beku tetap adopted='available').
export function tampilanStatusTree(tree: {
  status: string;
  frozen?: boolean;
  reservedAdmin?: boolean;
  mitraId?: number | null;
}): { statusKey: string; label: string; className: string } {
  const statusKey = tree.mitraId
    ? "MITRA"
    : tree.reservedAdmin
      ? "RESERVED_ADMIN"
      : tree.frozen
        ? "FROZEN"
        : tree.status;
  const meta = TREE_STATUS[statusKey] ?? TREE_STATUS.AVAILABLE;
  return { statusKey, ...meta };
}
