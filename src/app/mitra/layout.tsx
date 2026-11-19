import { requireUser } from "@/lib/guard";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/admin-shell";
import { I18nProvider } from "@/components/i18n-provider";
import { getDict, getLocale } from "@/lib/i18n";

export default async function MitraLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  if (!session.mitraId) redirect("/dashboard");

  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <AdminShell
        name={session.name}
        level={0}
        userId={session.userId}
        photo={session.photo}
        mitra
      >
        {children}
      </AdminShell>
    </I18nProvider>
  );
}
