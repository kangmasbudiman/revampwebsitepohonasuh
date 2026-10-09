import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/settings";
import { apiGet, mapKontak, type ApiKontak } from "@/lib/api";
import { getDict } from "@/lib/i18n";

export default async function SiteFooter() {
  const s = await getSettings();
  const t = (await getDict()).footer;

  // Kontak utama dari Laravel (tabel kontak, sumber tunggal bersama
  // mobile & admin web) — fallback ke settings lokal bila API gagal.
  let k: ApiKontak | null = null;
  try {
    k = mapKontak(await apiGet<Record<string, unknown>>("getkontak"));
  } catch {
    // biarkan fallback settings
  }
  const email = k?.email || s["contact.email"];
  const whatsapp = k?.whatsapp || s["contact.whatsapp"];
  const telepon = k?.telepon || null;

  return (
    <footer className="mt-16 bg-emerald-950 text-emerald-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/images/logo_putih.png"
            alt="Logo Pohon Asuh"
            width={112}
            height={112}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/25"
          />
          <p className="mt-3 text-sm leading-6 text-emerald-200">
            {s["site.description"] ?? "Program adopsi pohon bersama masyarakat lokal."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">{t.explore}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/pohon" className="hover:text-white">{t.treeData}</Link></li>
            <li><Link href="/spesies" className="hover:text-white">{t.speciesCatalog}</Link></li>
            <li><Link href="/kalkulator-karbon" className="hover:text-white">{t.carbonCalc}</Link></li>
            <li><Link href="/lokasi" className="hover:text-white">{t.forestLocation}</Link></li>
            <li><Link href="/blog" className="hover:text-white">{t.blog}</Link></li>
            <li><Link href="/cerita-dampak" className="hover:text-white">{t.impactStories}</Link></li>
            <li><Link href="/keuangan" className="hover:text-white">{t.financeReport}</Link></li>
            <li><Link href="/faq" className="hover:text-white">{t.faq}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">{t.contact}</h3>
          <ul className="mt-3 space-y-2 text-sm text-emerald-200">
            {email && <li>{email}</li>}
            {whatsapp && <li>{t.wa}: {whatsapp}</li>}
            {telepon && <li>{t.phone}: {telepon}</li>}
            {s["contact.address"] && <li>{s["contact.address"]}</li>}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">{t.followUs}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {s["contact.instagram"] && (
              <li><a href={s["contact.instagram"]} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a></li>
            )}
            {s["contact.facebook"] && (
              <li><a href={s["contact.facebook"]} target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a></li>
            )}
            {s["contact.youtube"] && (
              <li><a href={s["contact.youtube"]} target="_blank" rel="noopener noreferrer" className="hover:text-white">YouTube</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-emerald-900 py-4 text-center text-xs text-emerald-300">
        © {new Date().getFullYear()} Pohon Asuh — {s["site.tagline"] ?? "Adopt Trees, Save The World"} ·{" "}
        <Link href="/syarat-ketentuan" className="underline-offset-4 hover:text-white hover:underline">
          {t.terms}
        </Link>{" "}
        ·{" "}
        <Link href="/kebijakan-privasi" className="underline-offset-4 hover:text-white hover:underline">
          {t.privacy}
        </Link>
      </div>
    </footer>
  );
}
