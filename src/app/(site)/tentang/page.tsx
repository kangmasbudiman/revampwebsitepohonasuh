import Link from "next/link";
import Image from "next/image";
import { Sprout, MapPin, Users, Wallet } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { getTentangPublik, apiGet, mapStatistik, type ApiStatistik } from "@/lib/api";
import { db } from "@/lib/prisma";
import Reveal from "@/components/reveal";
import CountUp from "@/components/count-up";

export async function generateMetadata() {
  const t = (await getDict()).pages.tentang;
  return { title: t.title, description: t.metaDesc };
}

const Heading = ({ children }: { children: React.ReactNode }) => (
  <>
    <h2 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100 sm:text-3xl">{children}</h2>
    <div className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" />
  </>
);

// Halaman "Tentang Pohon Asuh" — konten dinamis dari admin panel
// (tentangpublik). Belum diisi / API mati → fallback teks bawaan dict.
export default async function TentangPage() {
  const dict = await getDict();
  const t = dict.pages.tentang;

  let data = null;
  try {
    data = await getTentangPublik();
  } catch {
    // fallback di bawah
  }
  let stat: ApiStatistik | null = null;
  try {
    stat = mapStatistik(await apiGet<Record<string, unknown>>("statistikdampak"));
  } catch {
    // strip statistik dilewati
  }
  const faqPreview = await db.faq.findMany({
    where: { aktif: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: 3,
  });

  const judul = data?.judul || t.fallbackJudul;
  // Normalisasi CRLF (\r\n) dari admin + pecah di tiap baris baru agar
  // tampilan publik sama persis dengan yang dilihat admin di textarea.
  const paragraf = (s: string) =>
    s
      .replace(/\r\n?/g, "\n")
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  const deskripsiParagraf = paragraf(data?.deskripsi || t.fallbackDeskripsi);
  const mekanismeParagraf = paragraf(data?.mekanisme || t.fallbackMekanisme);
  const langkah =
    data && data.langkah.length > 0
      ? data.langkah.map((l) => ({ judul: l.judul, isi: l.isi }))
      : t.fallbackLangkah;

  const stats = stat
    ? [
        { label: dict.home.statAdopted, value: stat.diadopsi, icon: Sprout },
        { label: dict.home.statLocations, value: stat.desa, icon: MapPin },
        { label: dict.home.statDonors, value: stat.donatur, icon: Users },
      ]
    : [];

  return (
    <main className="w-full flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl animate-float-soft dark:bg-emerald-700/20" />
        <div className="pointer-events-none absolute -left-16 top-32 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-800/20" />
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-14">
          <Reveal>
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  {dict.nav.tentang}
                </p>
                <h1 className="pa-hgrad mt-3 max-w-2xl text-4xl font-bold sm:text-5xl">{judul}</h1>
              </div>
              <Image
                src="/images/logo_icon.png"
                alt=""
                width={140}
                height={140}
                className="hidden h-28 w-28 shrink-0 rotate-6 rounded-3xl object-cover opacity-25 ring-1 ring-emerald-200 sm:block dark:opacity-20 dark:ring-emerald-800"
              />
            </div>
          </Reveal>
          {stat && stat.donasi > 0 && (
            <Reveal delay={150}>
              <div className="mt-8 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-white shadow-md shadow-emerald-200">
                <Wallet className="h-5 w-5" />
                <span className="text-lg font-bold">
                  <span className="mr-1 align-middle text-sm font-semibold">Rp</span>
                  <CountUp target={stat.donasi} format="id-ID" />
                </span>
                <span className="text-sm text-emerald-50">{dict.home.statFunds}</span>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Strip statistik dampak */}
      {stats.length > 0 && (
        <section className="border-y border-emerald-100 bg-white/70 dark:border-night-700 dark:bg-night-900/40">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-3 gap-4 px-4 py-8 sm:gap-8">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 100}>
                <div className="group flex flex-col items-center rounded-2xl px-2 py-4 text-center transition-transform hover:-translate-y-1 sm:px-6">
                  <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-night-800 dark:text-emerald-400">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-3xl">
                    <CountUp target={s.value} />
                  </p>
                  <p className="mt-1 text-xs text-emerald-900/70 dark:text-emerald-200/70 sm:text-sm">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 pb-16">
        {/* Apa itu Pohon Asuh */}
        <section className="mt-12">
          <Reveal>
            <Heading>{t.apaItuTitle}</Heading>
          </Reveal>
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Reveal className="lg:col-span-3">
              <p className="text-lg leading-8 text-zinc-700 dark:text-zinc-300">
                {deskripsiParagraf[0]}
              </p>
              {deskripsiParagraf.slice(1).map((p, i) => (
                <p key={i} className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
                  {p}
                </p>
              ))}
            </Reveal>
            <Reveal delay={150} className="lg:col-span-2">
              <div className="pa-card flex h-full flex-col justify-center rounded-3xl p-6 ring-1 ring-emerald-100 dark:ring-night-700">
                <Sprout className="h-8 w-8 text-emerald-600" />
                <p className="mt-3 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
                  {t.ctaSub}
                </p>
                <Link
                  href="/pohon"
                  className="pa-btn-primary mt-4 inline-flex w-fit items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {dict.home.adoptNowCta}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Mekanisme Program — kartu bernomor otomatis per paragraf */}
        <section className="mt-14">
          <Reveal>
            <Heading>{t.mekanismeTitle}</Heading>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {mekanismeParagraf.map((p, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="group h-full rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-night-700 dark:bg-night-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-night-800 dark:text-emerald-300">
                    {i + 1}
                  </span>
                  <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">{p}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Cara Mengasuh Pohon — timeline */}
        <section className="mt-14">
          <Reveal>
            <Heading>{t.caraTitle}</Heading>
          </Reveal>
          <ol className="relative mt-8 space-y-6 border-l-2 border-emerald-200 pl-8 dark:border-night-700">
            {langkah.map((l, i) => (
              <li key={`${l.judul}-${i}`} className="relative">
                <span className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-emerald-100 dark:ring-night-800" />
                <Reveal delay={i * 100}>
                  <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-night-700 dark:bg-night-900 dark:hover:border-emerald-800">
                    <p className="flex items-center gap-2 font-semibold text-emerald-950 dark:text-emerald-100">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {l.judul}
                    </p>
                    <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-300">{l.isi}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Preview FAQ */}
        {faqPreview.length > 0 && (
          <section className="mt-14">
            <Reveal>
              <Heading>{dict.pages.faq.heading}</Heading>
            </Reveal>
            <div className="mt-6 space-y-3">
              {faqPreview.map((f) => (
                <details
                  key={f.id}
                  className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-colors open:border-emerald-300 dark:border-night-700 dark:bg-night-900 dark:open:border-emerald-700"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-emerald-950 dark:text-emerald-100 [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="shrink-0 text-xl text-emerald-600 transition-transform duration-200 group-open:rotate-45">
                      ＋
                    </span>
                  </summary>
                  <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">{f.answer}</p>
                </details>
              ))}
            </div>
            <Reveal>
              <Link
                href="/faq"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline dark:text-emerald-400"
              >
                {t.faqMore} →
              </Link>
            </Reveal>
          </section>
        )}

        {/* CTA akhir */}
        <section className="mt-16">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-12 text-center shadow-xl shadow-emerald-200 dark:shadow-none">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <p className="text-2xl font-bold text-white sm:text-3xl">{t.cta}</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-50">{t.ctaSub}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/pohon"
                  className="inline-flex items-center rounded-xl bg-white px-7 py-3 text-sm font-bold text-emerald-800 shadow transition-transform hover:-translate-y-0.5"
                >
                  {t.cta}
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex items-center rounded-xl border border-emerald-300/60 px-7 py-3 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-800/40"
                >
                  {t.faqLink}
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </main>
  );
}
