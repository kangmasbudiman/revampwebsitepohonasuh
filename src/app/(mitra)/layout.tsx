import MitraNav from "@/components/mitra-nav";
import MitraFooter from "@/components/mitra-footer";
import { getSession } from "@/lib/auth";
import { I18nProvider } from "@/components/i18n-provider";
import { getDict, getLocale } from "@/lib/i18n";

export default async function MitraLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
        <MitraNav session={session} />
        <div className="flex flex-1 flex-col">{children}</div>
        <MitraFooter dict={dict} />
      </div>
    </I18nProvider>
  );
}
