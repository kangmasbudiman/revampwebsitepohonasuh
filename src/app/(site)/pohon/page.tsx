import Link from "next/link";
import { apiGet, apiPost, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { labelLokasi, rupiah } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import TreeCard from "@/components/tree-card";
import TreeViewToggle from "@/components/tree-view-toggle";
import TreeListView from "@/components/tree-list-view";
import TreeFilterCard from "@/components/tree-filter-card";

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
  const provinsi = typeof searchParams.provinsi === "string" ? searchParams.provinsi : "";
  const harga = Number(searchParams.harga) || 0;
  const diameter = typeof searchParams.diameter === "string" ? searchParams.diameter : "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Tampilan default (tanpa param) tetap pohon tersedia; submenu header
  // "Adopted" memakai ?status=adopted.
  const status = searchParams.status === "adopted" ? "adopted" : "available";
  const view = searchParams.view === "list" ? "list" : "grid";
  const sortParam = typeof searchParams.sort === "string" ? searchParams.sort : "newest";
  const SORT_VALUES = ["newest", "oldest", "most-adopted", "least-adopted", "price-asc", "price-desc", "diameter-asc", "diameter-desc", "name-asc", "name-desc"];
  const sort = SORT_VALUES.includes(sortParam) ? sortParam : "newest";

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
    let rows: Record<string, unknown>[];
    if (status === "adopted") {
      rows = await apiPost<Record<string, unknown>[]>("filtertrees", { adopted: "adopted" });
      const namaAktif = aktif?.name;
      if (namaAktif) rows = rows.filter((r) => String(r.desa ?? "") === namaAktif);
    } else {
      rows = aktif
        ? await apiPost<Record<string, unknown>[]>("pohonbydesa", { desa: aktif.name })
        : await apiPost<Record<string, unknown>[]>("filtertrees", { adopted: "available" });
    }
    trees = mapTrees(rows).filter((t) => byNama.get(t.desa) !== false);
    if (provinsi) {
      const provByNama = new Map(semua.map((x) => [x.name, x.provinsi]));
      trees = trees.filter((t) => provByNama.get(t.desa) === provinsi);
    }
  } catch {
    error = true;
  }

  // Filter harga: pill per harga unik pada lingkup lokasi aktif.
  const hargaList = [...new Set(trees.map((t) => t.priceIdr))]
    .filter((h) => h > 0)
    .sort((a, b) => a - b);
  if (harga) trees = trees.filter((t) => t.priceIdr === harga);

  // Filter diameter: pill rentang (min inklusif, max eksklusif).
  const RENTANG_DIAMETER = [
    { v: "lt50", min: 0, max: 50, label: "< 50 cm" },
    { v: "50-100", min: 50, max: 100, label: "50–100 cm" },
    { v: "gt100", min: 100, max: Infinity, label: "> 100 cm" },
  ];
  const rentangAktif = RENTANG_DIAMETER.find((r) => r.v === diameter);
  if (rentangAktif) {
    trees = trees.filter(
      (t) => (t.diameterCm ?? 0) >= rentangAktif.min && (t.diameterCm ?? 0) < rentangAktif.max,
    );
  }

  const qs = (o: { provinsi?: string; lokasi?: string; harga?: number; diameter?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (status === "adopted") sp.set("status", "adopted");
    if (o.provinsi) sp.set("provinsi", o.provinsi);
    if (o.lokasi) sp.set("lokasi", o.lokasi);
    if (o.harga) sp.set("harga", String(o.harga));
    if (o.diameter) sp.set("diameter", o.diameter);
    if (o.page && o.page > 1) sp.set("page", String(o.page));
    if (view !== "grid") sp.set("view", view);
    if (sort !== "newest") sp.set("sort", sort);
    const s = sp.toString();
    return s ? `/pohon?${s}` : "/pohon";
  };
  const labelByNama = new Map(desaList.map((d) => [d.name, d.label]));

  // Pohon unggulan (pilihan admin, highlight=1 via setPohonterbaik) selalu
  // tampil paling awal; sisanya diacak pada tampilan Semua lokasi agar desa
  // lain berpeluang tampil duluan. (highlight=2 = flag legacy lain, bukan unggulan.)
  const unggulan = trees.filter((t) => t.highlight === 1);
  const biasa = trees.filter((t) => t.highlight !== 1);
  const ordered = [...unggulan, ...(aktif ? biasa : acakHarian(biasa))];
  if (sort === "oldest") ordered.reverse();
  if (sort === "most-adopted") ordered.sort((a, b) => (b.highlight ?? 0) - (a.highlight ?? 0));
  if (sort === "least-adopted") ordered.sort((a, b) => (a.highlight ?? 0) - (b.highlight ?? 0));
  if (sort === "price-asc") ordered.sort((a, b) => a.priceIdr - b.priceIdr);
  if (sort === "price-desc") ordered.sort((a, b) => b.priceIdr - a.priceIdr);
  if (sort === "diameter-asc") ordered.sort((a, b) => (a.diameterCm ?? 0) - (b.diameterCm ?? 0));
  if (sort === "diameter-desc") ordered.sort((a, b) => (b.diameterCm ?? 0) - (a.diameterCm ?? 0));
  if (sort === "name-asc") ordered.sort((a, b) => a.localName.localeCompare(b.localName));
  if (sort === "name-desc") ordered.sort((a, b) => b.localName.localeCompare(a.localName));

  const total = ordered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageTrees = ordered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const d = (await getDict()).pages.pohon;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.title}</h1>
      <p className="mt-2 text-zinc-600">{status === "adopted" ? d.introAdopted : d.intro}</p>

      <TreeFilterCard
        provinsi={provinsi}
        lokasi={lokasi ?? ""}
        harga={harga}
        diameter={diameter}
        provinsiList={[...new Set(desaList.map((x) => x.provinsi).filter(Boolean))].sort() as string[]}
        desaList={desaList.map((x) => ({ slug: x.slug, nama: labelLokasi(x), provinsi: x.provinsi }))}
        hargaList={hargaList}
        rentangDiameter={RENTANG_DIAMETER}
        params={{
          provinsi: provinsi || undefined,
          lokasi,
          harga: harga ? String(harga) : undefined,
          diameter: diameter || undefined,
          status: status === "adopted" ? "adopted" : undefined,
          page: page > 1 ? String(page) : undefined,
          view: view !== "grid" ? view : undefined,
          sort: sort !== "newest" ? sort : undefined,
        }}
        labels={{
          title: d.filterTitle,
          provinsi: d.filterProvinsi,
          provinsiHint: d.filterProvinsiHint,
          pilihProvinsi: d.filterPilihProvinsi,
          provinsiCount: d.filterProvinsiCount,
          desa: d.filterDesa,
          desaHint: d.filterDesaHint,
          pilihDesa: d.filterPilihDesa,
          desaDisabled: d.filterDesaDisabled,
          desaHelp: d.filterDesaHelp,
          price: d.filterPrice,
          priceHint: d.filterPriceHint,
          diameter: d.filterDiameter,
          diameterHint: d.filterDiameterHint,
          allPrices: d.allPrices,
          allDiameters: d.allDiameters,
          reset: d.resetFilter,
        }}
      />

      {error ? (
        <p className="mt-10 text-center text-zinc-500">
          {d.loadError}{" "}
          <Link href="/pohon" className="font-medium text-emerald-700 hover:underline">
            {d.retry}
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {(status === "adopted" ? d.adoptedCount : d.availableCount).replaceAll(
                "{n}",
                String(total),
              )}
            </p>
            <TreeViewToggle
              view={view}
              sort={sort}
              params={{
                lokasi,
                harga: harga ? String(harga) : undefined,
                diameter: diameter || undefined,
                status: status === "adopted" ? "adopted" : undefined,
                page: page > 1 ? String(page) : undefined,
                view: view !== "grid" ? view : undefined,
                sort: sort !== "newest" ? sort : undefined,
              }}
              labels={{
                view: d.view,
                grid: d.grid,
                list: d.list,
                sort: d.sort,
                sortNewest: d.sortNewest,
                sortOldest: d.sortOldest,
                sortMostAdopted: d.sortMostAdopted,
                sortLeastAdopted: d.sortLeastAdopted,
                sortPriceAsc: d.sortPriceAsc,
                sortPriceDesc: d.sortPriceDesc,
                sortDiameterAsc: d.sortDiameterAsc,
                sortDiameterDesc: d.sortDiameterDesc,
                sortNameAsc: d.sortNameAsc,
                sortNameDesc: d.sortNameDesc,
              }}
            />
          </div>

          <div key={view} className="pa-fade-in mt-4">
            {view === "list" ? (
              <TreeListView trees={pageTrees.map((tree) => ({
                ...tree,
                location: { name: tree.desa, label: labelByNama.get(tree.desa) ?? null },
              }))} startNo={(page - 1) * PER_PAGE + 1} />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pageTrees.map((tree, i) => (
                  <TreeCard
                    key={`${tree.code}-${i}`}
                    tree={{
                      ...tree,
                      location: { name: tree.desa, label: labelByNama.get(tree.desa) ?? null },
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {total === 0 && (
            <div className="mt-10 text-center">
              <p className="text-zinc-500">{d.emptyFiltered}</p>
              <Link href={qs({})} className="mt-3 inline-flex rounded-xl border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                {d.resetFilter}
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-between">
              {page > 1 ? (
                <Link
                  href={qs({ lokasi, harga, diameter, page: page - 1 })}
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
                  href={qs({ lokasi, harga, diameter, page: page + 1 })}
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
