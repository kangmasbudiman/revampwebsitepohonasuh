import Link from "next/link";
import Image from "next/image";
import { apiGet, mapSosmedList, type ApiSosmed } from "@/lib/api";
import SosmedIcon from "@/components/sosmed-icon";
import type { Dict } from "@/lib/i18n";

export default async function MitraFooter({ dict }: { dict: Dict }) {
  let sosmed: ApiSosmed[] = [];
  try {
    sosmed = mapSosmedList(await apiGet<Record<string, unknown>[]>("getsosmed"));
  } catch {
    // fallback bila API tidak terjangkau
  }
  const fallback: ApiSosmed[] = [
    { id: -1, label: "Instagram", url: "https://www.instagram.com/pohonasuh/", ikon: "instagram" },
    { id: -2, label: "Facebook", url: "https://www.facebook.com/pohonasuh/", ikon: "facebook" },
    { id: -3, label: "YouTube", url: "https://www.youtube.com/user/kkiwarsi", ikon: "youtube" },
  ];
  const sosmedList = sosmed.length > 0 ? sosmed : fallback;

  return (
    <div className="bg-emerald-950 text-emerald-100 border-t border-emerald-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs">
        <div className="shrink-0">
          <Image src="/images/logo_putih.png" alt="Pohon Asuh — Save The Tree and Donate Now" width={220} height={62} className="h-14 sm:h-16 w-auto object-contain" priority />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          <Link href="/">{dict.nav.home}</Link>
          <Link href="/tentang">{dict.footer.tentang}</Link>
          <Link href="/lokasi">{dict.footer.forestLocation}</Link>
          <Link href="/cerita-dampak">{dict.footer.impactStories}</Link>
          <Link href="/kerjasama-mitra">{dict.footer.partnership}</Link>
          <span className="hidden sm:inline text-emerald-700">|</span>
          <span className="hidden sm:inline">pohonasuh.org</span>
        </div>
        {/* Ikuti Kami — sama dengan footer situs utama (sumber: getsosmed) */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:border-l sm:border-emerald-800 sm:pl-6">
          {sosmedList.map((sm) => (
            <a key={sm.id} href={sm.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-200 transition-colors hover:text-white" aria-label={sm.label}>
              <SosmedIcon ikon={sm.ikon} className="h-4 w-4" />
              <span className="hidden min-[420px]:inline">{sm.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
