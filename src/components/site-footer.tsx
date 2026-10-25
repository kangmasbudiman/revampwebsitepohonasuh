import Link from "next/link";
import Image from "next/image";

// Ikon brand (lucide-react sudah tidak menyediakan ikon merek) — SVG
// sederhana mengikuti ukuran ikon lucide (stroke/fill 24x24).
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}
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
  // Sosmed dikelola penuh lewat tabel kontak (input admin Pengaturan) —
  // tanpa fallback settings lama agar "kosongkan untuk sembunyikan" bekerja.
  const instagram = k?.instagram ?? null;
  const facebook = k?.facebook ?? null;
  const youtube = k?.youtube ?? null;

  return (
    <footer className="mt-16 bg-emerald-950 text-emerald-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo_icon.png"
              alt="Logo Pohon Asuh"
              width={112}
              height={112}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/25"
            />
            <span className="whitespace-nowrap text-xl font-bold tracking-tight text-white">
              Pohon Asuh
            </span>
          </div>
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
            <li><Link href="/tentang" className="hover:text-white">{t.tentang}</Link></li>
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
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                  <InstagramIcon className="h-4 w-4" /> Instagram
                </a>
              </li>
            )}
            {facebook && (
              <li>
                <a href={facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                  <FacebookIcon className="h-4 w-4" /> Facebook
                </a>
              </li>
            )}
            {youtube && (
              <li>
                <a href={youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                  <YoutubeIcon className="h-4 w-4" /> YouTube
                </a>
              </li>
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
