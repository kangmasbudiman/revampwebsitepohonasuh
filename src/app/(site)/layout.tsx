import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { I18nProvider } from "@/components/i18n-provider";
import { getSession } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
        <SiteHeader session={session} />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </div>
    </I18nProvider>
  );
}
