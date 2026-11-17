import { requireUser } from "@/lib/guard";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/admin-shell";

export default async function MitraLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  if (!session.mitraId) redirect("/dashboard");

  return (
    <AdminShell
      name={session.name}
      level={0}
      userId={session.userId}
      photo={session.photo}
      mitra
    >
      {children}
    </AdminShell>
  );
}
