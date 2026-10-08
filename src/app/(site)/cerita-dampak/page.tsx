import Link from "next/link";
import Image from "next/image";
import { MapPin, Quote } from "lucide-react";
import {
  apiGet,
  mapCeritas,
  mapTestimonis,
  type ApiCerita,
  type ApiTestimoni,
} from "@/lib/api";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getDict()).pages.cerita.title };
}

function excerpt(isi: string, max = 160) {
  const teks = isi.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return teks.length > max ? teks.slice(0, max).trimEnd() + "…" : teks;
}

export default async function CeritaDampakPage() {
  const d = (await getDict()).pages.cerita;

  let cerita: ApiCerita[] = [];
  let testimoni: ApiTestimoni[] = [];
  let error = false;
  try {
    cerita = mapCeritas(await apiGet<Record<string, unknown>[]>("ceritalist"));
  } catch {
    error = true;
  }
  try {
    testimoni = mapTestimonis(await apiGet<Record<string, unknown>[]>("testimonilist"));
  } catch {
    // section testimoni opsional
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.heading}</h1>
      <p className="mt-2 max-w-3xl text-zinc-600">{d.intro}</p>

      {error ? (
        <p className="mt-10 text-center text-zinc-500">
          {d.loadError}{" "}
          <Link href="/cerita-dampak" className="font-medium text-emerald-700 hover:underline">
            {d.retry}
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cerita.map((c) => (
            <Link
              key={c.id}
              href={`/cerita-dampak/${c.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] bg-emerald-50">
                {c.fotoUrl ? (
                  <Image
                    src={c.fotoUrl}
                    alt={c.judul}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">🌱</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-bold leading-snug text-emerald-950 group-hover:text-emerald-700">
                  {c.judul}
                </h2>
                <p className="mt-1.5 text-xs font-medium text-emerald-700">
                  {c.narasumber}
                  {c.peran && <span className="font-normal text-zinc-500"> · {c.peran}</span>}
                </p>
                {c.lokasi && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3.5 w-3.5" /> {c.lokasi}
                  </p>
                )}
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-zinc-600">
                  {excerpt(c.isi)}
                </p>
                <span className="mt-3 text-sm font-semibold text-emerald-700 group-hover:underline">
                  {d.readStory} →
                </span>
              </div>
            </Link>
          ))}
          {cerita.length === 0 && (
            <p className="col-span-full mt-6 text-center text-zinc-500">{d.empty}</p>
          )}
        </div>
      )}

      {testimoni.length > 0 && (
        <section className="mt-16">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
            {d.testiEyebrow}
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-emerald-950">
            {d.testiTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-500">
            {d.testiIntro}
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimoni.map((t) => (
              <figure
                key={t.id}
                className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
              >
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
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
