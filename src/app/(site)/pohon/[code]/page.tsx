import Link from "next/link";
import { notFound } from "next/navigation";
import { TreePine } from "lucide-react";
import {
  apiPost,
  mapTree,
  mapTrees,
  mapRiwayatPohon,
  slugify,
  type ApiTree,
  type ApiRiwayatPohon,
} from "@/lib/api";
import { getSession } from "@/lib/auth";
import { namaDesa, rupiah } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import StatusBadge from "@/components/status-badge";
import TreeCard from "@/components/tree-card";
import AdoptPanel from "@/components/adopt-panel";
import TreeHero from "@/components/tree-hero";

export default async function TreeDetailPage(props: PageProps<"/pohon/[code]">) {
  const { code } = await props.params;
  const session = await getSession();

  let tree: ApiTree | null = null;
  let others: ApiTree[] = [];
  let galeri: string[] = [];
  let riwayat: ApiRiwayatPohon[] = [];
  try {
    const row = await apiPost<Record<string, unknown> | null>("pohonbykode", {
      idpohon: decodeURIComponent(code),
    });
    if (row) tree = mapTree(row);
    if (tree) {
      const rows = await apiPost<Record<string, unknown>[]>("pohonbydesa", {
        desa: tree.desa,
      });
      others = mapTrees(rows)
        .filter((t) => t.code !== tree!.code)
        .slice(0, 3);
    }
    galeri = (
      await apiPost<{ urlnya?: string }[]>("pohonimage", { idpohon: decodeURIComponent(code) })
    )
      .map((r) => String(r.urlnya ?? ""))
      .filter(Boolean);
    riwayat = (
      await apiPost<Record<string, unknown>[]>("riwayatpohon", {
        idpohon: decodeURIComponent(code),
      })
    ).map(mapRiwayatPohon);
  } catch {
    // biarkan notFound di bawah yang menangani
  }
  if (!tree) notFound();

  const dict = await getDict();
  const d = dict.pages.pohonDetail;
  const statusLabel = dict.tree;
  const tglFmt = new Intl.DateTimeFormat((await getLocale()) === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // "2018-01-27" diparse sebagai lokal (bukan UTC) agar tak bergeser -1 hari.
  const tglTampil = (s: string | null) => {
    if (!s) return "—";
    const dt = new Date(s.includes("T") ? s : `${s}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? "—" : tglFmt.format(dt);
  };

  const specs = [
    { label: d.diameter, value: tree.diameterCm ? `${tree.diameterCm} cm` : "—" },
    {
      label: d.biomass,
      value:
        tree.tonase !== null
          ? d.ton.replaceAll("{n}", tree.tonase.toLocaleString("id-ID", { maximumFractionDigits: 1 }))
          : "—",
    },
    { label: d.height, value: tree.heightM ? `${tree.heightM} m` : "—" },
    { label: d.circumference, value: tree.kelilingCm ? `${tree.kelilingCm} cm` : "—" },
    { label: d.code, value: tree.code },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/pohon" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        {d.back}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <TreeHero
          nama={tree.localName}
          photoUrl={tree.photoUrl}
          galeri={galeri}
          ariaLabel={d.galleryAria}
        />

        <div>
          <div className="flex items-center gap-3">
            <StatusBadge {...(tree.status === "AVAILABLE"
              ? { label: statusLabel.statusAvailable, className: "bg-emerald-100 text-emerald-800" }
              : tree.status === "RESERVED"
                ? { label: statusLabel.statusReserved, className: "bg-amber-100 text-amber-800" }
                : { label: statusLabel.statusAdopted, className: "bg-zinc-100 text-zinc-600" })} />
            <Link
              href={`/lokasi/${slugify(tree.desa)}`}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              📍 {namaDesa(tree.desa)}
            </Link>
          </div>

          <h1 className="mt-3 text-3xl font-bold text-emerald-950">{tree.localName}</h1>
          <p className="mt-1 text-lg italic text-zinc-500">{tree.species}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4">
            {specs.map((spec) => (
              <div key={spec.label} className="rounded-xl bg-emerald-50/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">
                  {spec.label}
                </dt>
                <dd className="mt-1 font-semibold text-emerald-950">{spec.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-600">{d.adoptionFee}</span>
              <span className="text-2xl font-bold text-emerald-700">{rupiah(tree.priceIdr)}</span>
            </div>
            <p className="mt-1 text-right text-xs text-zinc-500">{d.perYear}</p>
            <div className="mt-4">
              {tree.status === "AVAILABLE" ? (
                <AdoptPanel
                  tree={{
                    code: tree.code,
                    localName: tree.localName,
                    desa: tree.desa,
                    priceIdr: tree.priceIdr,
                    photoUrl: tree.photoUrl,
                  }}
                  loggedIn={!!session}
                />
              ) : (
                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">
                  {d.unavailable}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {riwayat.length > 0 && (
        <section className="mt-16" aria-labelledby="riwayat-adopsi">
          <h2 id="riwayat-adopsi" className="text-xl font-bold text-emerald-950">
            {d.riwayatTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {d.riwayatSub.replaceAll("{n}", String(riwayat.length))}
          </p>
          <ol className="mt-6 space-y-3">
            {riwayat.map((r) => (
              <li
                key={r.id}
                data-testid="riwayat-item"
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    r.aktif
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  <TreePine className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-emerald-950">{r.nama}</p>
                  {r.hadiah && (
                    <p className="text-xs text-emerald-700">
                      🎁 {d.riwayatGift.replaceAll("{name}", r.hadiah)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {r.dur} {r.dur === 1 ? statusLabel.year : statusLabel.years} ·{" "}
                    {d.riwayatMulai} {tglTampil(r.tglAdopt)} · {d.riwayatAkhir}{" "}
                    {tglTampil(r.tglExp)}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                    r.aktif
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {r.aktif ? d.riwayatAktif : d.riwayatSelesai}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-emerald-950">
            {d.others.replaceAll("{desa}", namaDesa(tree.desa))}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((t, ti) => (
              <TreeCard
                key={`${t.code}-${ti}`}
                tree={{ ...t, location: { name: t.desa } }}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
