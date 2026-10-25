import Link from "next/link";
import { apiGet, apiPost, mapDesa, mapSpeciesList, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { labelLokasi, rupiah } from "@/lib/format";
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
  const harga = Number(searchParams.harga) || 0;
  const diameter = typeof searchParams.diameter === "string" ? searchParams.diameter : "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Tampilan default (tanpa param) tetap pohon tersedia; submenu header
  // "Adopted" memakai ?status=adopted.
  const status = searchParams.status === "adopted" ? "adopted" : "available";

  let desaList: ApiDesa[] = [];
  let trees: ApiTree[] = [];
  let serapanBySpecies = new Map<string, number>();
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
    // Serapan karbon per spesies (katalog /spesies) — join berdasarkan nama
    // latin; hanya sebagian spesies yang punya estimasi.
    const species = mapSpeciesList(await apiGet<Record<string, unknown>[]>("specieslist"));
    serapanBySpecies = new Map(
      species
        .filter((s) => s.serapanKarbon !== null)
        .map((s) => [s.namaLatin.toLowerCase().trim(), s.serapanKarbon as number]),
    );  } catch {
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

  const qs = (o: { lokasi?: string; harga?: number; diameter?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (status === "adopted") sp.set("status", "adopted");
    if (o.lokasi) sp.set("lokasi", o.lokasi);
    if (o.harga) sp.set("harga", String(o.harga));
    if (o.diameter) sp.set("diameter", o.diameter);
    if (o.page && o.page > 1) sp.set("page", String(o.page));
    const s = sp.toString();
    return s ? `/pohon?${s}` : "/pohon";
  };
  const pillCls = (on: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${
      on ? "bg-emerald-600 text-white" : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
    }`;
  const labelByNama = new Map(desaList.map((d) => [d.name, d.label]));

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
      <p className="mt-2 text-zinc-600">{status === "adopted" ? d.introAdopted : d.intro}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={qs({ harga, diameter })} className={pillCls(!lokasi)}>
          {d.allLocations}
        </Link>
        {desaList.map((desa) => (
          <Link
            key={desa.slug}
            href={qs({ lokasi: desa.slug, harga, diameter })}
            className={pillCls(lokasi === desa.slug)}
          >
            {labelLokasi(desa)}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={qs({ lokasi, diameter })} className={pillCls(!harga)}>
          {d.allPrices}
        </Link>
        {hargaList.map((h) => (
          <Link
            key={h}
            href={qs({ lokasi, harga: h, diameter })}
            className={pillCls(harga === h)}
          >
            {rupiah(h)}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={qs({ lokasi, harga })} className={pillCls(!diameter)}>
          {d.allDiameters}
        </Link>
        {RENTANG_DIAMETER.map((r) => (
          <Link
            key={r.v}
            href={qs({ lokasi, harga, diameter: r.v })}
            className={pillCls(diameter === r.v)}
          >
            {r.label}
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
            {(status === "adopted" ? d.adoptedCount : d.availableCount).replaceAll(
              "{n}",
              String(total),
            )}
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pageTrees.map((tree, i) => (
              <TreeCard
                key={`${tree.code}-${i}`}
                tree={{
                  ...tree,
                  serapanKarbon: tree.species
                    ? (serapanBySpecies.get(tree.species.toLowerCase().trim()) ?? 0)
                    : 0,
                  location: { name: tree.desa, label: labelByNama.get(tree.desa) ?? null },
                }}
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
