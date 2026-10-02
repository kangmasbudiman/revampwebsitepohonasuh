import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/settings";
import { apiGet, mapKontak, type ApiKontak } from "@/lib/api";

export default async function SiteFooter() {
  const s = await getSettings();

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
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo_putih.png"
              alt="Logo Pohon Asuh"
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
            <span className="text-lg font-bold">Pohon Asuh</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-emerald-200">
            {s["site.description"] ?? "Program adopsi pohon bersama masyarakat lokal."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Jelajahi</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/pohon" className="hover:text-white">Data Pohon</Link></li>
            <li><Link href="/spesies" className="hover:text-white">Katalog Spesies</Link></li>
            <li><Link href="/kalkulator-karbon" className="hover:text-white">Kalkulator Karbon</Link></li>
            <li><Link href="/lokasi" className="hover:text-white">Lokasi Hutan</Link></li>
            <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
            <li><Link href="/keuangan" className="hover:text-white">Laporan Keuangan</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Kontak</h3>
          <ul className="mt-3 space-y-2 text-sm text-emerald-200">
            {email && <li>{email}</li>}
            {whatsapp && <li>WA: {whatsapp}</li>}
            {telepon && <li>Telp: {telepon}</li>}
            {s["contact.address"] && <li>{s["contact.address"]}</li>}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Ikuti Kami</h3>
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
          Syarat &amp; Ketentuan
        </Link>{" "}
        ·{" "}
        <Link href="/kebijakan-privasi" className="underline-offset-4 hover:text-white hover:underline">
          Kebijakan Privasi
        </Link>
      </div>
    </footer>
  );
}
