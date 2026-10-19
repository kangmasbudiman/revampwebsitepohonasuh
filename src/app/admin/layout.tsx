import { requireAdmin } from "@/lib/guard";
import { apiGet, mapLaporans } from "@/lib/api";
import AdminShell from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();

  // Badge menu "Laporan Kegiatan": jumlah BTOR terkirim menunggu pemeriksaan
  // (khusus admin — petugas tidak memeriksa laporan).
  let laporanMenunggu = 0;
  if ((session.level ?? 1) === 1) {
    try {
      laporanMenunggu = mapLaporans(
        await apiGet<Record<string, unknown>[]>("laporanlist?status=terkirim"),
      ).length;
    } catch {
      // badge disembunyikan bila API tak terjangkau
    }
  }

  return (
    <AdminShell
      name={session.name}
      level={session.level}
      userId={session.userId}
      photo={session.photo}
      laporanMenunggu={laporanMenunggu}
    >
      {children}
    </AdminShell>
  );
}
