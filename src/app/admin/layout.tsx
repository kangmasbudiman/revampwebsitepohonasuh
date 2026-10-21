import { requireAdmin } from "@/lib/guard";
import { apiGet } from "@/lib/api";
import AdminShell from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();

  // Badge menu Laporan BTOR: jumlah BTOR menunggu verifikasi (admin saja).
  let btorTerkirim: number | undefined;
  if ((session.level ?? 1) === 1) {
    try {
      const rows = await apiGet<unknown[]>("btorlist?status=terkirim");
      btorTerkirim = Array.isArray(rows) ? rows.length : 0;
    } catch {
      btorTerkirim = undefined;
    }
  }

  return (
    <AdminShell
      name={session.name}
      level={session.level}
      userId={session.userId}
      photo={session.photo}
      btorTerkirim={btorTerkirim}
    >
      {children}
    </AdminShell>
  );
}
