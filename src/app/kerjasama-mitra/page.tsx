import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf, Handshake, Building2, Users, TreePine, BadgeCheck, LineChart, FileText, LayoutDashboard, Tag, BarChart3 } from "lucide-react";

export const metadata = {
  title: "Kerjasama Mitra | Pohon Asuh",
  description:
    "Menjadi mitra Pohon Asuh: buat program adopsi pohon, bagikan ke pengadopsi, pantau dampaknya. Semua terkelola dalam satu platform.",
};


export default function KerjasamaMitraPage() {
  return (
    <main className="w-full overflow-hidden bg-white">
      {/* ── TOP NAV MINI ── */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b border-emerald-100">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/images/logo_icon.png" alt="Pohon Asuh" width={36} height={36} className="rounded-full" />
            <span className="text-lg font-extrabold text-emerald-900">Pohon Asuh</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600">
            <Link href="#mengapa">Mengapa Mitra</Link>
            <Link href="#siapa">Siapa yang Bisa</Link>
            <Link href="#cara">Cara Kerja</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <Link href="/daftar-mitra" className="shrink-0 rounded-full bg-emerald-500 px-3 py-2 text-[10px] sm:px-6 sm:py-2.5 sm:text-xs font-bold text-white shadow-emerald-900/40 hover:bg-emerald-400 transition-all hover:scale-[1.03]">
            Daftar →
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative isolate bg-emerald-950 text-white">
        {/* background image */}
        <Image src="/images/hero-mitra.jpg" alt="Raksasa kayu besar di hutan" fill priority sizes="100vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/60 to-emerald-950/10" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-24 lg:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-700/70 px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-200 ring-1 ring-emerald-600">
                <Leaf className="h-3.5 w-3.5" /> Menjadi Mitra Pohon Asuh
              </span>
            </div>

            <h1 className="mt-5 sm:mt-6 text-4xl sm:text-6xl font-extrabold leading-[1.1] sm:leading-[1.08]">
              Bersama Menjaga
              <br />
              Pohon, Hutan,
              <br />
              dan Kehidupan
            </h1>
            <p className="mt-5 sm:mt-6 max-w-lg text-sm sm:text-base leading-6 sm:leading-7 text-emerald-100">
              Kolaborasi untuk mendukung masyarakat yang menjaga hutan dan melestarikan
              keanekaragaman hayati.
            </p>

            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <Link href="/daftar-mitra" className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white shadow-lg shadow-emerald-900/40 hover:scale-[1.03] hover:bg-emerald-400">
                Daftar Menjadi Mitra <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a href="#cara" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 transition">
                Pelajari Cara Kerja <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── APA ITU ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <figure className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-lg">
            <Image src="/images/pohon1.jpg" alt="Tim Pohon Asuh di lapangan" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
          </figure>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950">Apa Itu Mitra Pohon Asuh?</h2>
            <p className="mt-4 text-base leading-7 text-zinc-700">
              Mitra Pohon Asuh merupakan skema kolaborasi antara KKI Warsi dengan
              perusahaan, organisasi, komunitas, lembaga pendidikan, maupun institusi
              lainnya untuk mendukung perlindungan dan pemeliharaan hutan melalui
              program adopsi pohon.
            </p>
          </div>
        </div>
      </section>

      {/* ── MENGAPA MITRA ── */}
      <section id="mengapa" className="bg-emerald-50 border-t border-emerald-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950">Mengapa Menjadi Mitra?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Aksi Nyata untuk Lingkungan", desc: "Berkontribusi langsung dalam menjaga hutan.", icon: <TreePine className="h-7 w-7" /> },
              { title: "Program Kolaborasi", desc: "Berkarya bersama masyarakat dan KKI Warsi.", icon: <Handshake className="h-7 w-7" /> },
              { title: "Identitas Organisasi", desc: "Tampilkan komitmen lingkungan organisasi Anda.", icon: <Building2 className="h-7 w-7" /> },
              { title: "Transparansi Dampak", desc: "Pantau perkembangan dan dampak program secara berkala.", icon: <LineChart className="h-7 w-7" /> },
            ].map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  {c.icon}
                </span>
                <h3 className="font-bold text-emerald-900">{c.title}</h3>
                <p className="text-sm text-zinc-600">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIAPA ── */}
      <section id="siapa" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950">Siapa yang Bisa Menjadi Mitra?</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Perusahaan", icon: <Building2 className="h-12 w-12 text-zinc-700" /> },
              { label: "Organisasi/NGO", icon: <Handshake className="h-12 w-12 text-zinc-700" /> },
              { label: "Komunitas", icon: <Users className="h-12 w-12 text-zinc-700" /> },
              { label: "Lembaga Pendidikan", icon: <FileText className="h-12 w-12 text-zinc-700" /> },
              { label: "Institusi", icon: <BadgeCheck className="h-12 w-12 text-zinc-700" /> },
            ].map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-3xl border border-zinc-100 bg-zinc-50 p-6">
                <span className="flex h-16 w-16 items-center justify-center">{c.icon}</span>
                <span className="text-sm font-semibold text-zinc-800">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM ── */}
      <section className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Kelola Program Adopsi dalam Satu Platform</h2>
            <p className="mt-4 text-sm leading-6 text-emerald-100">
              Dengan akun Mitra, Anda dapat membuat program adopsi pohon sesuai kebutuhan
              organisasi, dengan berbagai fitur unggulan.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                { icon: <LayoutDashboard className="h-5 w-5" />, title: "Buat Program Sendiri", desc: "Rancang program adopsi dengan nama dan periode kegiatan." },
                { icon: <Tag className="h-5 w-5" />, title: "Personalisasi Tagging Pohon", desc: "Gunakan logo dan identitas visual organisasi pada tagging pohon, termasuk informasi program." },
                { icon: <BarChart3 className="h-5 w-5" />, title: "Pantau Dampak Program", desc: "Lihat dokumentasi, perkembangan, dan laporan dampak kegiatan." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-emerald-300">
                    {item.icon}
                  </span>
                  <span>
                    <p className="font-semibold text-emerald-100">{item.title}</p>
                    <p className="mt-1 text-sm text-emerald-300">{item.desc}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white">
            <Image src="/images/papan-taging.png" alt="Platform Pohon Asuh" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* ── CARA KERJA ── */}
      <section id="cara" className="bg-emerald-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-emerald-950">Bagaimana Cara Kerja Kemitraan?</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4 lg:flex-nowrap lg:gap-0 lg:justify-between">
            {[
              { n: "1", label: "Daftar Menjadi Mitra" },
              { n: "2", label: "Verifikasi Akun" },
              { n: "3", label: "Buat Program Adopsi" },
              { n: "4", label: "Pilih & Adopsi Pohon" },
              { n: "5", label: "Personalisasi Tagging" },
              { n: "6", label: "Pantau Dampak Program" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-36 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-extrabold text-white">
                  {step.n}
                </span>
                <span className="text-[11px] font-semibold text-emerald-900 leading-tight">{step.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {[{ icon: <Leaf className="h-6 w-6" />, title: "Bersama Menjaga Hutan untuk Masa Depan", desc: "Kegiatan Kolaborasi", href: "#" },
              { icon: <TreePine className="h-6 w-6" />, title: "Program Adopsi Pohon oleh Mitra", desc: "Kegiatan Kolaborasi", href: "#" },
              { icon: <Users className="h-6 w-6" />, title: "Kolaborasi untuk Hutan Lestari", desc: "Kegiatan Kolaborasi", href: "#" }].map((g, i) => (
              <a key={i} href={g.href} className="group rounded-2xl border border-emerald-100 bg-white p-4 flex items-center gap-3 hover:shadow-md transition">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition">{g.icon}</span>
                <span>
                  <p className="text-sm font-bold text-emerald-900">{g.title}</p>
                  <p className="text-[11px] text-zinc-500">{g.desc}</p>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-white border-t border-emerald-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-emerald-950">Pertanyaan yang Sering Diajukan (FAQ)</h2>
          <div className="mt-8 divide-y divide-zinc-100 rounded-2xl border border-zinc-100">
            {[
              { q: "Siapa yang dapat menjadi Mitra Pohon Asuh?", a: "Siapa saja: perusahaan, organisasi, komunitas, lembaga pendidikan, institusi pemerintah, dan lembaga desa." },
              { q: "Apakah Mitra dapat membuat lebih dari satu program?", a: "Ya. Satu akun mitra dapat mengelola beberapa program, masing-masing dengan periode, pengadopsi, dan desain tagging sendiri." },
              { q: "Bisakah desain tagging pohon disesuaikan dengan identitas organisasi?", a: "Tentu. Anda dapat mengunggah desain tagging sendiri atau memilih template standar dari platform." },
              { q: "Bagaimana Mitra memantau dampak program?", a: "Melalui halaman Laporan di portal mitra Anda — menampilan total pohon ditahan, adopsi tercatat, sertifikat terbit, rekap per program, dan ekspor CSV." },
            ].map((f, i) => (
              <details key={i} className="px-5 py-4 group">
                <summary className="cursor-pointer font-semibold text-emerald-900 flex items-center justify-between gap-4">
                  {f.q}
                  <span className="transition group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-3 text-sm leading-6 text-zinc-600">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNNEL CTA ── */}
      <section className="relative isolate bg-emerald-950 text-white">
        <Image src="/images/pohon1.jpg" alt="Pohon besar besar di hutan" fill sizes="100vw" className="object-cover object-center opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/65 to-emerald-950/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-snug">Mari Jadikan Komitmen Lingkungan<br />sebagai Aksi Nyata.</h2>
            <p className="mt-2 max-w-lg text-sm text-emerald-100">Bergabunglah menjadi Mitra Pohon Asuh dan mulai bangun kolaborasi untuk menjaga hutan, mendukung masyarakat, serta melestarikan keanekaragaman hayati.</p>
          </div>
          <Link href="/daftar-mitra" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-emerald-500 px-8 sm:px-10 py-4 text-sm sm:text-base font-semibold text-white shadow-lg shadow-emerald-900/40 hover:scale-[1.03] hover:bg-emerald-400">
            Daftar Menjadi Mitra <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
      {/* ── FOOTER MINI STRIP ── */}
      <div className="bg-emerald-950 text-emerald-100 border-t border-emerald-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Image src="/images/logo_icon.png" alt="Pohon Asuh" width={96} height={96} className="rounded-full" priority />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/">Beranda</Link>
            <Link href="/tentang">Tentang Kami</Link>
            <Link href="/lokasi">Lokasi Pohon</Link>
            <Link href="/cerita-dampak">Cerita Dampak</Link>
            <Link href="#">Kemitraan</Link>
            <span className="hidden sm:inline text-emerald-700">|</span>
            <span className="hidden sm:inline">pohonasuh.org</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://www.youtube.com/user/kkiwarsi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">▶</a>
            <a href="https://www.instagram.com/pohonasuh/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">📸</a>
            <a href="https://wa.me/628117453700" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">📱</a>
            <a href="https://www.facebook.com/pohonasuh/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">f</a>
          </div>
        </div>
      </div>
    </main>
  );
}
