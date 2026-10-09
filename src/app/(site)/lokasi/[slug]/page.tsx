import Link from "next/link";
import { notFound } from "next/navigation";
import {
  apiGet,
  apiPost,
  mapDesa,
  mapPetaPohons,
  mapTrees,
  type ApiDesa,
  type ApiPetaPohon,
  type ApiTree,
} from "@/lib/api";
import { namaDesa } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import TreeCard from "@/components/tree-card";
import DesaMapLoader from "@/components/desa-map-loader";

export default async function LocationDetailPage(props: PageProps<"/lokasi/[slug]">) {
  const { slug } = await props.params;

  let desa: ApiDesa | undefined;
  let trees: ApiTree[] = [];
  let petaPohon: ApiPetaPohon[] = [];
  try {
    const rows = await apiGet<Record<string, unknown>[]>("getdesa");
    // lokasi nonaktif (disembunyikan admin) dianggap tidak ada
    desa = rows.map(mapDesa).find((d) => d.slug === slug && d.aktif);
    if (desa) {
      trees = mapTrees(await apiPost<Record<string, unknown>[]>("pohonbydesa", { desa: desa.name }));
    }
  } catch {
    // notFound di bawah yang menangani
  }
  if (!desa) notFound();

  try {
    petaPohon = mapPetaPohons(
      await apiPost<Record<string, unknown>[]>("pohonmapdesa", { desa: desa.name }),
    );
  } catch {
    // peta opsional — kartu statistik tetap tampil
  }
  const titikPeta = petaPohon.filter((p) => p.lat !== null && p.lng !== null);

  const pct = desa.total > 0 ? Math.round((desa.adopted / desa.total) * 100) : 0;
  const d = (await getDict()).pages.lokasiDetail;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/lokasi" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        {d.back}
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-emerald-950">{namaDesa(desa.name)}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {[desa.kecamatan, desa.kabupaten, desa.provinsi].filter(Boolean).join(", ")}
      </p>
      {desa.description && (
        <p className="mt-3 max-w-2xl leading-7 text-zinc-600">{desa.description}</p>
      )}

      <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{desa.total}</p>
          <p className="text-xs text-zinc-500">{d.statTotal}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{desa.adopted}</p>
          <p className="text-xs text-zinc-500">{d.statAdopted}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-700">{desa.available}</p>
          <p className="text-xs text-zinc-500">{d.statAvailable}</p>
        </div>
      </div>
      <div className="mt-3 max-w-2xl">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{d.progress}</span>
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

      {titikPeta.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-emerald-950">
            {d.mapTitle.replaceAll("{n}", String(titikPeta.length))}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{d.mapHint}</p>
          <div className="mt-4">
            <DesaMapLoader desa={desa.name} pohon={titikPeta} />
          </div>
        </section>
      )}

      <h2 className="mt-10 text-xl font-bold text-emerald-950">
        {d.treesTitle.replaceAll("{n}", String(trees.length))}
      </h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {trees.map((tree, i) => (
          <TreeCard
            key={`${tree.code}-${i}`}
            tree={{ ...tree, location: { name: tree.desa } }}
          />
        ))}
      </div>
      {trees.length === 0 && (
        <p className="mt-6 text-zinc-500">{d.treesEmpty}</p>
      )}
    </main>
  );
}
