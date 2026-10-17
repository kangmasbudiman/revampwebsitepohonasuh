import SiteFooter from "@/components/site-footer";
import { I18nProvider } from "@/components/i18n-provider";
import { getDict, getLocale } from "@/lib/i18n";

// Route group khusus halaman "Bagikan Aksi Saya": TANPA site header —
// design story tampil mandiri (1080×1920, dipajang/diunduh), footer
// tetap ada.
export default async function BagikanLayout({ children }: { children: React.ReactNode }) {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </div>
    </I18nProvider>
  );
}
