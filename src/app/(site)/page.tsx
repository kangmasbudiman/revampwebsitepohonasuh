import Link from "next/link";
import { Leaf, MapPin, Quote, Sprout, TreeDeciduous, Users } from "lucide-react";
import {
  apiGet,
  apiPost,
  mapDesa,
  mapPartners,
  mapPosts,
  mapSliders,
  mapStatistik,
  mapTestimonis,
  mapTrees,
  type ApiDesa,
  type ApiPartner,
  type ApiPost,
  type ApiSlider,
  type ApiStatistik,
  type ApiTestimoni,
  type ApiTree,
} from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getDict } from "@/lib/i18n";
import TreeCard from "@/components/tree-card";
import PostCard from "@/components/post-card";
import HeroSlider, { type HeroSlide } from "@/components/hero-slider";
import Reveal from "@/components/reveal";
import CountUp from "@/components/count-up";

export default async function HomePage() {
  const s = await getSettings();
  const dict = await getDict();
  const d = dict.home;

  let trees: ApiTree[] = [];
  let unggulan: ApiTree[] = [];
  let locations: ApiDesa[] = [];
  let posts: ApiPost[] = [];
  let apiSliders: ApiSlider[] = [];
  let stat: ApiStatistik | null = null;
  let testimoni: ApiTestimoni[] = [];
  let partners: ApiPartner[] = [];
  // peta status aktif per nama desa (false = disembunyikan admin) — dipakai
  // menyaring pohon di beberapa section; desa tak terdaftar tetap tampil.
  let byNamaAktif = new Map<string, boolean>();
  try {
    const semua = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
    byNamaAktif = new Map(semua.map((d) => [d.name, d.aktif]));
    locations = semua.filter((d) => d.aktif);
    trees = mapTrees(
      await apiPost<Record<string, unknown>[]>("filtertrees", { adopted: "available" }),
    ).filter((t) => byNamaAktif.get(t.desa) !== false);
  } catch {
    // hero tetap tampil, section data kosong
  }
  try {
    // Pohon unggulan dipilih admin (setPohonterbaik); kosong → fallback 6 tersedia pertama.
    unggulan = mapTrees(await apiGet<Record<string, unknown>[]>("pohonhighlight")).filter(
      (t) => byNamaAktif.get(t.desa) !== false,
    );
  } catch {
    // fallback di bawah
  }
  try {
    stat = mapStatistik(await apiGet<Record<string, unknown>>("statistikdampak"));
  } catch {
    // fallback: agregat getdesa di bawah
  }
  try {
    posts = mapPosts(await apiGet<Record<string, unknown>[]>("blog"))
      .sort((a, b) => b.id - a.id)
      .slice(0, 3);
  } catch {
    // section artikel opsional
  }
  try {
    apiSliders = mapSliders(await apiGet<Record<string, unknown>[]>("slider"));
  } catch {
    // fallback ke slide bawaan
  }
  // Testimoni & partner dari panel admin — section hanya tampil bila ada
  // isinya (belum ada konten → beranda tetap bersih).
  try {
    testimoni = mapTestimonis(await apiGet<Record<string, unknown>[]>("testimonilist"));
  } catch {
    // section opsional
  }
  try {
    partners = mapPartners(await apiGet<Record<string, unknown>[]>("partnerlist"));
  } catch {
    // section opsional
  }

  const total = stat?.pohon ?? locations.reduce((sum, d) => sum + d.total, 0);
  const adopted = stat?.diadopsi ?? locations.reduce((sum, d) => sum + d.adopted, 0);
  const featured = unggulan.length > 0 ? unggulan : trees.slice(0, 6);

  const tagline = s["site.tagline"] ?? "Adopt Trees, Save The World";
  const description = s["site.description"] ?? dict.metadata.defaultDesc;

  // Slider utama dikelola admin (Kelola Slider) — sumber yang sama dengan
  // aplikasi mobile. Fallback ke slide bawaan bila API gagal/kosong.
  const defaultSlides: HeroSlide[] = [
    {
      image: "/images/Lokasi-Pohon-Asuh-2023.jpg",
      eyebrow: tagline,
      title: d.slide1Title,
      description,
      cta: { label: d.adoptNowCta, href: "/pohon" },
      secondary: { label: d.viewLocationsCta, href: "/lokasi" },
    },
    {
      image: "/images/pohon1.jpg",
      eyebrow: d.slide2Eyebrow,
      title: d.slide2Title,
      description: d.slide2Desc,
      cta: { label: d.exploreTreesCta, href: "/pohon" },
      secondary: { label: d.slide2Secondary, href: "/faq" },
    },
    {
      image: "/images/pohon2.jpg",
      eyebrow: d.slide3Eyebrow,
      title: d.slide3Title,
      description: d.slide3Desc,
      cta: { label: d.slide3Cta, href: "/keuangan" },
    },
    {
      image: "/images/pohon3.jpg",
      eyebrow: d.slide4Eyebrow,
      title: d.slide4Title,
      description: d.slide4Desc,
      cta: { label: d.slide4Cta, href: "/lokasi" },
    },
  ];

  const slides: HeroSlide[] = apiSliders
    .filter((sl) => sl.imageUrl && sl.judul)
    .map((sl) => ({
      image: sl.imageUrl as string,
      eyebrow: tagline,
      title: sl.judul,
      description: sl.deskripsi,
      cta: { label: d.adoptNowCta, href: "/pohon" },
    }));
  const heroSlides = slides.length > 0 ? slides : defaultSlides;

  const seenSpecies = new Set<string>();
  const marqueeItems = trees
    .filter((t) => {
      const key = t.localName.toLowerCase();
      if (seenSpecies.has(key)) return false;
      seenSpecies.add(key);
      return true;
    })
    .slice(0, 40)
    .map((t) => `${t.localName}${t.species ? ` · ${t.species}` : ""}`);
  const marqueeLoop = [...marqueeItems, ...marqueeItems];

  const stats = [
    { label: d.statTrees, value: total, icon: TreeDeciduous },
    { label: d.statAdopted, value: adopted, icon: Sprout },
    { label: d.statLocations, value: stat?.desa ?? locations.length, icon: MapPin },
    { label: d.statDonors, value: stat?.donatur ?? 0, icon: Users },
  ];

  const steps = [
    { step: "1", title: d.step1Title, desc: d.step1Desc },
    { step: "2", title: d.step2Title, desc: d.step2Desc },
    { step: "3", title: d.step3Title, desc: d.step3Desc },
  ];

  return (
    <main className="-mt-16 flex-1">
      <HeroSlider slides={heroSlides} />

      {/* Marquee jenis pohon */}
      <section className="overflow-hidden border-b border-emerald-100 bg-emerald-50/70 py-4">
        <div className="marquee-track flex w-max items-center gap-10">
          {marqueeLoop.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-10 whitespace-nowrap text-sm font-medium text-emerald-800/70"
            >
              <Leaf className="h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 100}>
              <div className="group flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                  <stat.icon className="h-6 w-6" />
                </span>
                <p className="text-3xl font-bold text-emerald-700">
                  <CountUp target={stat.value} />
                </p>
                <p className="mt-1 text-sm text-emerald-900/70">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="pb-6 text-center text-sm">
          <Link
            href="/kalkulator-karbon"
            className="font-medium text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline"
          >
            {d.carbonLink}
          </Link>
        </p>
      </section>

      {/* Cara kerja */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
            {d.stepsEyebrow}
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-emerald-950">
            {d.stepsTitle}
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" />
        </Reveal>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((item, i) => (
            <Reveal key={item.step} delay={i * 150}>
              <div className="group h-full rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xl font-bold text-white shadow-lg shadow-emerald-200 transition-transform duration-300 group-hover:scale-110">
                  {item.step}
                </div>
                <h3 className="mt-5 font-semibold text-emerald-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pohon unggulan */}
      <section className="bg-gradient-to-b from-white to-emerald-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  {d.featuredEyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-bold text-emerald-950">{d.featuredTitle}</h2>
              </div>
              <Link
                href="/pohon"
                className="rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow"
              >
                {d.viewAll}
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((tree, i) => (
              <Reveal key={`${tree.code}-${i}`} delay={(i % 3) * 120}>
                <TreeCard tree={{ ...tree, location: { name: tree.desa } }} />
              </Reveal>
            ))}
          </div>
          {featured.length === 0 && (
            <p className="mt-8 text-center text-zinc-500">{d.featuredEmpty}</p>
          )}
        </div>
      </section>

      {/* Artikel terbaru */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  {d.blogEyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-bold text-emerald-950">{d.blogTitle}</h2>
              </div>
              <Link
                href="/blog"
                className="rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow"
              >
                {d.viewAll}
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={(i % 3) * 120}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Testimoni — hanya saat admin sudah mengisi (Testimoni & Partner) */}
      {testimoni.length > 0 && (
        <section className="bg-gradient-to-b from-white to-emerald-50/50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                {d.testiEyebrow}
              </p>
              <h2 className="mt-3 text-center text-3xl font-bold text-emerald-950">
                {d.testiTitle}
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimoni.slice(0, 6).map((t, i) => (
                <Reveal key={t.id} delay={(i % 3) * 120}>
                  <figure className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                    <Quote className="h-6 w-6 text-emerald-300" />
                    <blockquote className="mt-3 flex-1 text-sm leading-6 text-zinc-600">
                      “{t.isi}”
                    </blockquote>
                    <figcaption className="mt-4 flex items-center gap-3 border-t border-emerald-50 pt-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        {t.nama.trim().charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-emerald-950">
                          {t.nama}
                        </span>
                        {t.peran && (
                          <span className="block text-xs text-zinc-500">{t.peran}</span>
                        )}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partner / didukung oleh — hanya saat admin sudah mengisi */}
      {partners.length > 0 && (
        <section className="border-b border-emerald-100 bg-white py-14">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                {d.partners}
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((p) => {
                const inner = p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logoUrl}
                    alt={p.nama}
                    className="mx-auto h-12 w-auto object-contain opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                  />
                ) : (
                  <span className="block text-center text-sm font-semibold text-zinc-500">
                    {p.nama}
                  </span>
                );
                return p.url ? (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.nama}
                  >
                    {inner}
                  </a>
                ) : (
                  <span key={p.id} title={p.nama}>
                    {inner}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Lokasi */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                {d.locEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-emerald-950">{d.locTitle}</h2>
            </div>
            <Link
              href="/lokasi"
              className="rounded-full border border-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow"
            >
              {d.viewAll}
            </Link>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {locations.map((loc, i) => (
            <Reveal key={loc.slug} delay={(i % 2) * 150}>
              <Link
                href={`/lokasi/${loc.slug}`}
                className="group block h-full rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-emerald-950">{loc.name}</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors group-hover:bg-emerald-100">
                    {d.locTreeCount.replaceAll("{n}", String(loc.total))}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{loc.description}</p>
                <p className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-700 transition-transform duration-300 group-hover:translate-x-1">
                  <MapPin className="h-4 w-4" /> {d.locVisit}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-emerald-700 px-6 py-16 text-center text-white">
            <div
              className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/30 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
              aria-hidden
            />
            <TreeDeciduous className="mx-auto h-12 w-12 animate-float-soft text-emerald-200" />
            <h2 className="mt-4 text-3xl font-bold">{d.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-100">{d.ctaDesc}</p>
            <Link
              href="/daftar"
              className="mt-8 inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold text-emerald-800 shadow-lg transition-all hover:scale-[1.04] hover:bg-emerald-50"
            >
              {d.ctaButton}
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
