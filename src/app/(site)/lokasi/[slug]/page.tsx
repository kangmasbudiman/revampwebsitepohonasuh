import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Coins, Heart, Sprout, TreePine } from "lucide-react";
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
import { namaDesa, rupiah } from "@/lib/format";
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
  const tahun = new Date().getFullYear();

  const stats = [
    { icon: TreePine, value: desa.total, label: d.statTotal },
    { icon: Heart, value: desa.adopted, label: d.statAdopted },
    { icon: Sprout, value: desa.available, label: d.statAvailable },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/lokasi" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        {d.back}
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-emerald-950">{namaDesa(desa.name)}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {[desa.kecamatan, desa.kabupaten, desa.provinsi].filter(Boolean).join(", ")}
      </p>

      {/* Hero: foto hutan kiri + statistik & donasi kanan */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div
          data-testid="hero-foto"
          className="relative h-56 overflow-hidden rounded-2xl border border-emerald-100 shadow-sm sm:h-72 lg:h-auto lg:min-h-72"
        >
          <Image
            src={desa.photoUrl ?? "/images/Lokasi-Pohon-Asuh-2023.jpg"}
            alt={`Hutan ${namaDesa(desa.name)}`}
            fill
            sizes="(max-width: 1023px) 100vw, 440px"
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-white px-3 py-4 text-center shadow-sm"
              >
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <p
                  data-testid={["stat-total", "stat-adopted", "stat-available"][i]}
                  className="text-2xl font-bold text-emerald-700"
                >
                  {s.value}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                  <Coins className="h-4 w-4" />
                </span>
                {d.donasiTotal}
              </div>
              <p
                data-testid="donasi-total"
                className="mt-2 whitespace-nowrap text-2xl font-bold text-emerald-800"
              >
                {rupiah(desa.donasi)}
              </p>
              <p className="mt-0.5 text-xs text-emerald-600">{d.donasiTotalSub}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                </span>
                {d.donasiYear}
              </div>
              <p
                data-testid="donasi-tahun"
                className="mt-2 whitespace-nowrap text-2xl font-bold text-emerald-800"
              >
                {rupiah(desa.donasiTahun)}
              </p>
              <p className="mt-0.5 text-xs text-emerald-600">
                {d.donasiYearSub.replaceAll("{year}", String(tahun))}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{d.progress}</span>
              <span className="font-semibold text-emerald-700">
                {d.adoptedPct.replaceAll("{n}", String(pct))}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                data-testid="progress-fill"
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {desa.description && (
        <p data-testid="deskripsi-lokasi" className="mt-8 max-w-3xl leading-7 text-zinc-600">
          {desa.description}
        </p>
      )}

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
