import SiteFooter from "@/components/site-footer";

// Route group khusus halaman sertifikat: TANPA site header — lembar
// sertifikat tampil mandiri (dipajang/dicetak), footer tetap ada tapi
// ikut disembunyikan saat print.
export default function SertifikatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-zinc-900">
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
