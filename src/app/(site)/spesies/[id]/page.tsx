import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Leaf, MapPin, Sprout } from "lucide-react";
import { apiGet, mapSpeciesDetail, slugify, type ApiSpeciesDetail } from "@/lib/api";
import { namaDesa } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import TreeCard from "@/components/tree-card";
import CountUp from "@/components/count-up";

type Props = PageProps<"/spesies/[id]">;

export async function generateMetadata(props: Props) {
  const { id } = await props.params;
  const dict = await getDict();
  try {
    const s = mapSpeciesDetail(
      await apiGet<Record<string, unknown>>(`speciesdetail/${id}`),
    );
    if (s?.namaLatin) {
      return {
        title: dict.pages.spesiesDetail.title.replaceAll("{name}", s.namaLatin),
        description:
          s.deskripsi ||
          dict.pages.spesiesDetail.metaDesc.replaceAll("{name}", s.namaLatin),
      };
    }
  } catch {
    // metadata default
  }
  return { title: dict.pages.spesies.title };
}

export default async function SpeciesDetailPage(props: Props) {
  const { id } = await props.params;

  let s: ApiSpeciesDetail | null = null;
  try {
    const r = await apiGet<Record<string, unknown> | null>(`speciesdetail/${id}`);
    if (r) s = mapSpeciesDetail(r);
  } catch {
    // notFound di bawah yang menangani
  }
  if (!s || !s.namaLatin) notFound();

  const d = (await getDict()).pages.spesiesDetail;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/spesies" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        {d.back}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50 shadow-sm">
          {s.photoUrl ? (
            <Image
              src={s.photoUrl}
              alt={s.namaLatin}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">🌳</div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold italic text-emerald-950">{s.namaLatin}</h1>
          {s.namaLokal && <p className="mt-1 text-lg text-zinc-600">{s.namaLokal}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {s.famili && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                {d.famili.replaceAll("{name}", s.famili)}
              </span>
            )}
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600">
              {d.treeCount.replaceAll("{n}", String(s.jmlPohon))}
            </span>
            {s.jmlTersedia > 0 ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                {d.availableChip.replaceAll("{n}", String(s.jmlTersedia))}
              </span>
            ) : (
              s.jmlPohon > 0 && (
                <span className="rounded-full bg-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-500">
                  {d.soldOutChip}
                </span>
              )
            )}
          </div>

          {s.serapanKarbon !== null && (
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600/80">
                <Leaf className="h-3.5 w-3.5" /> {d.carbonTitle}
              </p>
              <p className="mt-2 text-4xl font-bold text-emerald-700">
                <CountUp target={s.serapanKarbon} duration={1200} />
                <span className="ml-2 text-base font-semibold text-emerald-800/70">
                  {d.carbonUnit}
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">{d.carbonNote}</p>
            </div>
          )}

          {s.deskripsi && <p className="mt-6 leading-7 text-zinc-600">{s.deskripsi}</p>}

          {s.desaTerkait.length > 0 && (
            <div className="mt-6">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                <MapPin className="h-4 w-4 text-emerald-600" /> {d.growsAt}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.desaTerkait.map((desa) => (
                  <Link
                    key={desa.nama}
                    href={`/lokasi/${slugify(desa.nama)}`}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    {d.desaChip
                      .replaceAll("{name}", namaDesa(desa.nama))
                      .replaceAll("{n}", String(desa.jml))}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pohon"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.03] hover:bg-emerald-700"
            >
              <Sprout className="h-4 w-4" />
              {d.adoptCta}
            </Link>
          </div>
        </div>
      </div>

      {s.pohon.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-emerald-950">
            {d.readyTitle.replaceAll("{name}", s.namaLatin).replaceAll("{n}", String(s.pohon.length))}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {d.readyNote}{" "}
            <Link href="/pohon" className="font-medium text-emerald-700 hover:underline">
              {d.readyNoteLink}
            </Link>{" "}
            {d.readyNotePost}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {s.pohon.map((p, pi) => (
              <TreeCard
                key={`${p.code}-${pi}`}
                tree={{
                  code: p.code,
                  localName: p.localName,
                  species: p.species,
                  priceIdr: p.priceIdr,
                  status: p.status,
                  photoUrl: p.photoUrl,
                  desa: p.desa,
                  location: { name: p.desa },
                }}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
