import Link from "next/link";
import Image from "next/image";

export default function MitraNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b border-emerald-100">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <Link href="/kerjasama-mitra" className="flex shrink-0 items-center gap-2" aria-label="Pohon Asuh — Kerjasama Mitra">
          <Image src="/images/logo_icon.png" alt="Pohon Asuh" width={36} height={36} className="rounded-full" />
          <span className="text-lg font-extrabold text-emerald-900">Pohon Asuh</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600">
          <Link href="/kerjasama-mitra#mengapa">Mengapa Mitra</Link>
          <Link href="/kerjasama-mitra#siapa">Siapa yang Bisa</Link>
          <Link href="/kerjasama-mitra#cara">Cara Kerja</Link>
          <Link href="/kerjasama-mitra#faq">FAQ</Link>
        </nav>
        <Link href="/daftar-mitra" className="shrink-0 rounded-full bg-emerald-500 px-3 py-2 text-[10px] sm:px-6 sm:py-2.5 sm:text-xs font-bold text-white shadow-emerald-900/40 hover:bg-emerald-400 transition-all hover:scale-[1.03]">
          Daftar →
        </Link>
      </div>
    </header>
  );
}
