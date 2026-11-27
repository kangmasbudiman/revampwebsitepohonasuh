import Link from "next/link";
import Image from "next/image";
import { MapPin, Ruler } from "lucide-react";
import type { ApiTree } from "@/lib/api";
import { labelLokasi, rupiah, tampilanStatusTree } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import AddToCartButton from "@/components/add-to-cart-button";
import StatusBadge from "@/components/status-badge";

type TreeWithLocation = ApiTree & {
  location?: { name: string; label?: string | null } | null;
};

function statusInfo(tree: TreeWithLocation, t: Record<string, string>) {
  const badge = tampilanStatusTree(tree);
  const peta: Record<string, string> = {
    AVAILABLE: t.statusAvailable,
    RESERVED: t.statusReserved,
    ADOPTED: t.statusAdopted,
    FROZEN: t.statusFrozen,
    RESERVED_ADMIN: t.statusReservedAdmin,
  };
  const label = peta[badge.statusKey] ?? badge.label;
  const bisa = tree.status === "AVAILABLE" && !tree.frozen && !tree.reservedAdmin;
  return { badge, label, bisa };
}

function Foto({ tree, nama }: { tree: TreeWithLocation; nama: string }) {
  if (!tree.photoUrl) {
    return (
      <span className="flex h-12 w-16 items-center justify-center rounded-lg bg-emerald-50 text-xl" aria-label={nama}>
        🌳
      </span>
    );
  }
  return (
    <Image
      src={tree.photoUrl}
      alt={nama}
      width={64}
      height={48}
      className="h-12 w-16 rounded-lg object-cover"
    />
  );
}

export default async function TreeListView({
  trees,
  startNo,
}: {
  trees: TreeWithLocation[];
  startNo: number;
}) {
  const dict = await getDict();
  const d = dict.pages.pohon;
  const t = dict.tree;

  return (
    <>
      {/* Desktop / tablet: tabel semantik */}
      <div className="hidden overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm md:block dark:border-night-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50 text-emerald-900 dark:bg-night-800 dark:text-emerald-200">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colNo}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colPhoto}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colName}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colLocation}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colDiameter}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colPrice}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{d.colStatus}</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">{d.colAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {trees.map((tree, i) => {
              const { badge, label, bisa } = statusInfo(tree, t as Record<string, string>);
              return (
                <tr key={`${tree.code}-${i}`} className="transition-colors hover:bg-emerald-50/60 dark:hover:bg-night-900/40">
                  <td className="px-4 py-3 text-zinc-500">{startNo + i}</td>
                  <td className="px-4 py-3"><Foto tree={tree} nama={tree.localName} /></td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-emerald-950 dark:text-white">{tree.localName}</p>
                    <p className="font-mono text-[11px] text-zinc-400">{tree.code}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      {tree.location ? labelLokasi(tree.location) : tree.desa ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      {tree.diameterCm ? `${tree.diameterCm} cm` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {rupiah(tree.priceIdr)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge label={label} className={badge.className} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/pohon/${tree.code}`}
                        className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        {d.detail} →
                      </Link>
                      {bisa ? (
                        <AddToCartButton
                          variant="solid"
                          label={d.adopt}
                          item={{
                            code: tree.code,
                            localName: tree.localName,
                            desa: tree.desa ?? tree.location?.name ?? "",
                            priceIdr: tree.priceIdr,
                            photoUrl: tree.photoUrl,
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-400 dark:bg-night-800"
                        >
                          {d.adopt}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: kartu horizontal ringkas (konsisten dengan kartu Grid) */}
      <div className="space-y-3 md:hidden">
        {trees.map((tree, i) => {
          const { badge, label, bisa } = statusInfo(tree, t as Record<string, string>);
          return (
            <article key={`${tree.code}-${i}`} className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-night-700">
              <div className="flex gap-3">
                <Foto tree={tree} nama={tree.localName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-emerald-950 dark:text-white">{tree.localName}</p>
                      <p className="font-mono text-[11px] text-zinc-400">{startNo + i} · {tree.code}</p>
                    </div>
                    <StatusBadge label={label} className={badge.className} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    {tree.location ? labelLokasi(tree.location) : tree.desa ?? "—"}
                    {" · "}
                    {tree.diameterCm ? `${tree.diameterCm} cm` : "—"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">{rupiah(tree.priceIdr)}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/pohon/${tree.code}`}
                  className="flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-center text-xs font-semibold text-emerald-700"
                >
                  {d.detail}
                </Link>
                {bisa ? (
                  <AddToCartButton
                    variant="solid"
                    label={d.adopt}
                    item={{
                      code: tree.code,
                      localName: tree.localName,
                      desa: tree.desa ?? tree.location?.name ?? "",
                      priceIdr: tree.priceIdr,
                      photoUrl: tree.photoUrl,
                    }}
                  />
                ) : (
                  <button disabled className="flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-400">
                    {d.adopt}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
