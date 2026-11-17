import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, MapPin, Globe, CalendarDays, Briefcase, Layers } from "lucide-react";

export const metadata = { title: "Profil Lembaga Mitra | Pohon Asuh" };

type LembagaData = {
  id?: number;
  nama?: string;
  slug?: string;
  logo?: string | null;
  website?: string | null;
  jenis?: string;
  bidang_kegiatan?: string;
  provinsi?: string;
  kota?: string;
  deskripsi?: string | null;
  joined?: string | null;
};

const chip = (label: string, Icon: typeof Briefcase) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
    <Icon className="h-3.5 w-3.5" aria-hidden />{label}
  </span>
);

export default async function MitraLembagaPage(props: PageProps<"/mitra-lembaga/[slug]">) {
  const { slug } = await props.params;
  const assetOrigin = (process.env.API_BASE_URL ?? "").replace(/\/api\/?$/, "");

  let d: LembagaData | null = null;
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/organisasibyslug?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (Number(json.value) === 200) d = json.data as LembagaData;
    }
  } catch {
    d = null;
  }
  if (!d) notFound();

  const joinedLabel = d.joined
    ? new Date(d.joined + "T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="w-full bg-emerald-50/40">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link href="/kerjasama-mitra" className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke Kerjasama Mitra
        </Link>

        {/* Hero lembaga */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl">
          <div className="h-3 w-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-lime-500" />
          <div className="px-5 sm:px-8 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="shrink-0 inline-flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-3xl bg-emerald-50/60 ring-1 ring-emerald-100 p-4">
              {d.logo ? (
                <Image src={`${assetOrigin}/assets/${d.logo}`} alt={`Logo ${d.nama}`} width={160} height={160} priority className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-14 w-14 text-emerald-500" aria-hidden />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-emerald-950 break-words">{d.nama}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.jenis && chip(d.jenis, Layers)}
                {d.bidang_kegiatan && chip(d.bidang_kegiatan, Briefcase)}
                {(d.kota || d.provinsi) && chip([d.kota, d.provinsi].filter(Boolean).join(", ").replace(/\b\w/g, (c) => c.toUpperCase()), MapPin)}
              </div>
              {joinedLabel && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Bergabung sejak {joinedLabel}
                </p>
              )}
            </div>
            {d.website && (
              <a
                href={d.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                <Globe className="h-4 w-4" aria-hidden />Kunjungi Website
              </a>
            )}
          </div>
        </div>

        {/* Tentang + Detail */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-emerald-100 bg-white p-6 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">Tentang Lembaga</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-700">
              {d.deskripsi ?? "Lembaga ini belum menulis profil singkat."}
            </p>
          </section>

          <aside className="rounded-3xl border border-emerald-100 bg-white p-6 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-800">Detail</h2>
            <dl className="mt-3 divide-y divide-emerald-50 text-sm">
              {d.jenis && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-zinc-400">Jenis</dt>
                  <dd className="text-right font-semibold text-zinc-800">{d.jenis}</dd>
                </div>
              )}
              {d.bidang_kegiatan && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-zinc-400">Bidang</dt>
                  <dd className="text-right font-semibold text-zinc-800">{d.bidang_kegiatan}</dd>
                </div>
              )}
              {(d.kota || d.provinsi) && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-zinc-400">Lokasi</dt>
                  <dd className="text-right font-semibold text-zinc-800">{[d.kota, d.provinsi].filter(Boolean).join(", ")}</dd>
                </div>
              )}
              {d.website && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-zinc-400">Website</dt>
                  <dd className="text-right font-semibold text-emerald-800 break-all">
                    <a href={d.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{d.website.replace(/^https?:\/\//, "")}</a>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {/* CTA */}
        <div className="mt-6 rounded-3xl bg-emerald-950 px-6 py-6 sm:px-10 sm:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
          <div>
            <h2 className="text-lg sm:text-2xl font-extrabold">Ingin lembaga Anda bergabung juga?</h2>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-emerald-200">Bergabunglah bersama {d.nama} dan lembaga lain yang peduli pada kelestarian hutan Indonesia.</p>
          </div>
          <Link href="/daftar-mitra" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 sm:px-8 py-3.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400 transition">
            Daftar Menjadi Mitra
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </main>
  );
}
