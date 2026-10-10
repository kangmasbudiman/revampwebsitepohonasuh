import Link from "next/link";
import Image from "next/image";
import { apiGet, mapDesa, type ApiDesa } from "@/lib/api";
import { namaDesa } from "@/lib/format";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getDict()).pages.lokasi.title };
}

export default async function LocationListPage() {
  let desaList: ApiDesa[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa"))
      .map(mapDesa)
      .filter((d) => d.aktif);
  } catch {
    // tampilkan daftar kosong di bawah
  }
  const d = (await getDict()).pages.lokasi;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">{d.intro}</p>

      <div className="mt-8 flex flex-col gap-6">
        {desaList.map((desa) => {
          const pct = desa.total > 0 ? Math.round((desa.adopted / desa.total) * 100) : 0;
          return (
            <div
              key={desa.slug}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex-row"
            >
              <Link
                href={`/lokasi/${desa.slug}`}
                className="group relative block h-44 w-full shrink-0 overflow-hidden sm:h-auto sm:w-52 md:w-64 lg:w-72"
              >
                <Image
                  src={desa.photoUrl ?? "/images/Lokasi-Pohon-Asuh-2023.jpg"}
                  alt={`Hutan ${namaDesa(desa.name)}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 288px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
              <div className="flex flex-1 flex-col p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/lokasi/${desa.slug}`} className="group">
                    <h2 className="text-lg font-semibold text-emerald-950 group-hover:text-emerald-700">
                      {namaDesa(desa.name)}
                    </h2>
                  </Link>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {d.treeCount.replaceAll("{n}", String(desa.total))}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {[desa.kecamatan, desa.kabupaten, desa.provinsi].filter(Boolean).join(", ")}
                </p>
                {desa.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {desa.description}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {d.adoptedAvailable
                        .replaceAll("{adopted}", String(desa.adopted))
                        .replaceAll("{available}", String(desa.available))}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {d.adoptedPct.replaceAll("{n}", String(pct))}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <Link
                    href={`/lokasi/${desa.slug}`}
                    className="rounded-full border border-emerald-200 px-4 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    {d.detail}
                  </Link>
                  {desa.available > 0 && (
                    <Link
                      href={`/pohon?lokasi=${desa.slug}`}
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                    >
                      {d.adoptHere}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {desaList.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">
          {d.loadError}{" "}
          <Link href="/lokasi" className="font-medium text-emerald-700 hover:underline">
            {d.retry}
          </Link>
        </p>
      )}
    </main>
  );
}
