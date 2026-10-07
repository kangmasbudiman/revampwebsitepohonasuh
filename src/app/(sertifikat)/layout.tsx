import SiteFooter from "@/components/site-footer";
import { I18nProvider } from "@/components/i18n-provider";
import { getDict, getLocale } from "@/lib/i18n";

// Route group khusus halaman sertifikat: TANPA site header — lembar
// sertifikat tampil mandiri (dipajang/dicetak), footer tetap ada tapi
// ikut disembunyikan saat print.
export default async function SertifikatLayout({ children }: { children: React.ReactNode }) {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
        <div className="flex flex-1 flex-col">{children}</div>
        <div className="print:hidden">
          <SiteFooter />
        </div>
      </div>
    </I18nProvider>
  );
}
