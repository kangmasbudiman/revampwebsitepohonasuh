import { requireAdmin } from "@/lib/guard";
import AdminShell from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireAdmin();

  return (
    <AdminShell
      name={session.name}
      level={session.level}
      userId={session.userId}
      photo={session.photo}
    >
      {children}
    </AdminShell>
  );
}
