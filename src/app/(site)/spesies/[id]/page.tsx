import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Leaf, MapPin, Sprout } from "lucide-react";
import { apiGet, mapSpeciesDetail, slugify, type ApiSpeciesDetail } from "@/lib/api";
import TreeCard from "@/components/tree-card";
import CountUp from "@/components/count-up";

type Props = PageProps<"/spesies/[id]">;

export async function generateMetadata(props: Props) {
  const { id } = await props.params;
  try {
    const s = mapSpeciesDetail(
      await apiGet<Record<string, unknown>>(`speciesdetail/${id}`),
    );
    if (s?.namaLatin) {
      return {
        title: `Spesies ${s.namaLatin}`,
        description: s.deskripsi || `Profil spesies ${s.namaLatin} di program Pohon Asuh.`,
      };
    }
  } catch {
    // metadata default
  }
  return { title: "Katalog Spesies" };
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/spesies" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        ← Kembali ke Katalog Spesies
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
                Famili {s.famili}
              </span>
            )}
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600">
              {s.jmlPohon} pohon terdata
            </span>
          </div>

          {s.serapanKarbon !== null && (
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600/80">
                <Leaf className="h-3.5 w-3.5" /> Serapan karbon (estimasi)
              </p>
              <p className="mt-2 text-4xl font-bold text-emerald-700">
                <CountUp target={s.serapanKarbon} duration={1200} />
                <span className="ml-2 text-base font-semibold text-emerald-800/70">
                  kg CO₂ / pohon / tahun
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Estimasi berdasarkan literatur jenis sejenis — bukan hasil pengukuran langsung.
              </p>
            </div>
          )}

          {s.deskripsi && <p className="mt-6 leading-7 text-zinc-600">{s.deskripsi}</p>}

          {s.desaTerkait.length > 0 && (
            <div className="mt-6">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                <MapPin className="h-4 w-4 text-emerald-600" /> Tumbuh di lokasi
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.desaTerkait.map((d) => (
                  <Link
                    key={d.nama}
                    href={`/lokasi/${slugify(d.nama)}`}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    {d.nama} · {d.jml} pohon
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
              Adopsi pohon spesies ini
            </Link>
          </div>
        </div>
      </div>

      {s.pohon.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-emerald-950">
            Pohon {s.namaLatin} siap diadopsi ({s.pohon.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Menampilkan maksimal 12 pohon tersedia — kunjungi{" "}
            <Link href="/pohon" className="font-medium text-emerald-700 hover:underline">
              Data Pohon
            </Link>{" "}
            untuk melihat semua.
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
                  status: "AVAILABLE",
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
