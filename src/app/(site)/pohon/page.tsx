import Link from "next/link";
import { apiGet, apiPost, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import TreeCard from "@/components/tree-card";

export async function generateMetadata() {
  return { title: (await getDict()).pages.pohon.title };
}

const PER_PAGE = 24;

// Acak stabil per hari (seed = tanggal UTC): urutan berubah tiap hari tapi
// konsisten sepanjang hari, sehingga paginasi antar halaman tidak tercecer.
function acakHarian<T>(items: T[]): T[] {
  const out = [...items];
  let seed = Math.floor(Date.now() / 86_400_000);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default async function TreeListPage(props: PageProps<"/pohon">) {
  const searchParams = await props.searchParams;
  const lokasi = typeof searchParams.lokasi === "string" ? searchParams.lokasi : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  let desaList: ApiDesa[] = [];
  let trees: ApiTree[] = [];
  let aktif: ApiDesa | undefined;
  let error = false;
  try {
    const semua = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
    // lokasi nonaktif disembunyikan dari web (toggle Data Lokasi admin)
    desaList = semua.filter((d) => d.aktif);
    const byNama = new Map(semua.map((d) => [d.name, d.aktif]));
    aktif = desaList.find((d) => d.slug === lokasi);
    const rows = aktif
      ? await apiPost<Record<string, unknown>[]>("pohonbydesa", { desa: aktif.name })
      : await apiPost<Record<string, unknown>[]>("filtertrees", { adopted: "available" });
    trees = mapTrees(rows).filter((t) => byNama.get(t.desa) !== false);
  } catch {
    error = true;
  }

  // Pohon unggulan (pilihan admin, highlight=1 via setPohonterbaik) selalu
  // tampil paling awal; sisanya diacak pada tampilan Semua lokasi agar desa
  // lain berpeluang tampil duluan. (highlight=2 = flag legacy lain, bukan unggulan.)
  const unggulan = trees.filter((t) => t.highlight === 1);
  const biasa = trees.filter((t) => t.highlight !== 1);
  const ordered = [...unggulan, ...(aktif ? biasa : acakHarian(biasa))];

  const total = ordered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageTrees = ordered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const d = (await getDict()).pages.pohon;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.title}</h1>
      <p className="mt-2 text-zinc-600">{d.intro}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/pohon"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !lokasi ? "bg-emerald-600 text-white" : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          {d.allLocations}
        </Link>
        {desaList.map((desa) => (
          <Link
            key={desa.slug}
            href={`/pohon?lokasi=${desa.slug}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              lokasi === desa.slug
                ? "bg-emerald-600 text-white"
                : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {desa.name}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="mt-10 text-center text-zinc-500">
          {d.loadError}{" "}
          <Link href="/pohon" className="font-medium text-emerald-700 hover:underline">
            {d.retry}
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-zinc-500">
            {d.availableCount.replaceAll("{n}", String(total))}
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pageTrees.map((tree, i) => (
              <TreeCard
                key={`${tree.code}-${i}`}
                tree={{ ...tree, location: { name: tree.desa } }}
              />
            ))}
          </div>
          {total === 0 && (
            <p className="mt-10 text-center text-zinc-500">{d.empty}</p>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-between">
              {page > 1 ? (
                <Link
                  href={`/pohon${lokasi ? `?lokasi=${lokasi}&` : "?"}page=${page - 1}`}
                  className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  {d.prevPage}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-zinc-500">
                {d.pageOf.replaceAll("{page}", String(page)).replaceAll("{total}", String(totalPages))}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/pohon${lokasi ? `?lokasi=${lokasi}&` : "?"}page=${page + 1}`}
                  className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  {d.nextPage}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
