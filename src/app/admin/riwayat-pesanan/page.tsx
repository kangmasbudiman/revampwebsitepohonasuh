import { redirect } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";

export const metadata = { title: "Riwayat Pesanan Pohon Mitra | Pohon Asuh" };

// Riwayat lengkap pesanan pohon mitra — memakai halaman Pesanan Pohon dengan
// filter status "Semua" (semua pesanan: pending/disetujui/ditolak).
export default async function AdminRiwayatPesananPage() {
  await requireAdminLevel();
  redirect("/admin/pesanan-mitra?status=semua");
}
