import Link from "next/link";
import Image from "next/image";
import { Leaf } from "lucide-react";
import { apiGet, mapSpeciesList, type ApiSpecies } from "@/lib/api";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  const t = (await getDict()).pages.spesies;
  return { title: t.title, description: t.metaDesc };
}

const ABJAD = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default async function SpeciesListPage(props: PageProps<"/spesies">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim().toLowerCase() : "";
  const huruf = typeof searchParams.huruf === "string" ? searchParams.huruf.toUpperCase() : "";

  let species: ApiSpecies[] = [];
  try {
    species = mapSpeciesList(await apiGet<Record<string, unknown>[]>("specieslist"));
  } catch {
    // daftar kosong di bawah
  }

  const tersedia = species.filter((s) => {
    if (huruf && !s.namaLatin.toUpperCase().startsWith(huruf)) return false;
    if (
      q &&
      !s.namaLatin.toLowerCase().includes(q) &&
      !s.namaLokal.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const chipCls = (aktif: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      aktif
        ? "bg-emerald-600 text-white shadow-sm"
        : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
    }`;
  const d = (await getDict()).pages.spesies;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">{d.intro}</p>

      <form method="GET" className="mt-6 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={d.searchPh}
          className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm text-emerald-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          {d.search}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link href="/spesies" className={chipCls(!huruf && !q)}>
          {d.all}
        </Link>
        {ABJAD.map((h) => (
          <Link
            key={h}
            href={`/spesies?huruf=${h}`}
            className={chipCls(huruf === h)}
            aria-label={d.letterAria.replaceAll("{h}", h)}
          >
            {h}
          </Link>
        ))}
      </div>

      {species.length > 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          {(q || huruf ? d.matched : d.listed).replaceAll("{n}", String(tersedia.length))}
        </p>
      )}

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tersedia.map((s) => (
          <Link
            key={s.id}
            href={`/spesies/${s.id}`}
            className="group overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative h-44 w-full bg-emerald-50">
              {s.photoUrl ? (
                <Image
                  src={s.photoUrl}
                  alt={s.namaLatin}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">🌳</div>
              )}
              {s.serapanKarbon !== null && (
                <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
                  <Leaf className="h-3.5 w-3.5" />
                  {d.carbonPerYear.replaceAll("{n}", String(s.serapanKarbon))}
                </span>
              )}
            </div>
            <div className="p-4">
              <h2 className="font-semibold italic text-emerald-950">{s.namaLatin}</h2>
              {s.namaLokal && <p className="mt-0.5 text-sm text-zinc-600">{s.namaLokal}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {s.famili && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {s.famili}
                  </span>
                )}
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  {d.treeCount.replaceAll("{n}", String(s.jmlPohon))}
                </span>
                {s.jmlTersedia > 0 ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    {d.availableChip.replaceAll("{n}", String(s.jmlTersedia))}
                  </span>
                ) : (
                  s.jmlPohon > 0 && (
                    <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                      {d.soldOutChip}
                    </span>
                  )
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {species.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">{d.loadError}</p>
      )}
      {species.length > 0 && tersedia.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">{d.noMatch}</p>
      )}
    </main>
  );
}
