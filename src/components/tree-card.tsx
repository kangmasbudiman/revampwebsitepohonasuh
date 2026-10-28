import Link from "next/link";
import Image from "next/image";
import { Leaf } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import AddToCartButton from "@/components/add-to-cart-button";
import CartMarker from "@/components/cart-marker";
import { labelLokasi, rupiah, TREE_STATUS } from "@/lib/format";
import { co2TotalKg, formatCo2 } from "@/lib/karbon";
import { getDict, getLocale } from "@/lib/i18n";

type TreeCardProps = {
  tree: {
    code: string;
    localName: string;
    species: string | null;
    priceIdr: number;
    status: string;
    photoUrl: string | null;
    desa?: string | null;
    diameterCm?: number | null;
    heightM?: number | null;
    co2Kg?: number | null;
    location?: { name: string; label?: string | null } | null;
  };
};

export default async function TreeCard({ tree }: TreeCardProps) {
  const dict = await getDict();
  const locale = await getLocale();
  const t = dict.tree;
  const statusLabel: Record<string, string> = {
    AVAILABLE: t.statusAvailable,
    RESERVED: t.statusReserved,
    ADOPTED: t.statusAdopted,
  };
  // Serapan CO₂ dihitung dari diameter (rumus sama dengan detail pohon) agar
  // kartu di semua halaman tampil konsisten tanpa menunggu properti co2Kg.
  const co2Kg = tree.co2Kg ?? co2TotalKg(tree.diameterCm);

  return (
    <Link
      href={`/pohon/${tree.code}`}
      className="group relative block h-full overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-44 w-full bg-emerald-50">
        {tree.photoUrl ? (
          <Image
            src={tree.photoUrl}
            alt={tree.localName}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🌳</div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge
            label={statusLabel[tree.status] ?? tree.status}
            className={TREE_STATUS[tree.status]?.className ?? "bg-zinc-100 text-zinc-600"}
          />
        </div>
        {tree.status === "AVAILABLE" && (
          <div className="absolute right-3 top-3">
            <AddToCartButton
              variant="icon"
              item={{
                code: tree.code,
                localName: tree.localName,
                desa: tree.desa ?? tree.location?.name ?? "",
                priceIdr: tree.priceIdr,
                photoUrl: tree.photoUrl,
              }}
            />
          </div>
        )}
        {co2Kg != null && (
          <span
            className={`absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur ${
              co2Kg > 0 ? "text-emerald-700" : "text-zinc-500"
            }`}
            title={dict.pages.spesies.carbonMethod}
          >
            <Leaf aria-hidden className="h-3.5 w-3.5" />
            {dict.pages.spesies.carbonEst.replaceAll(
              "{v}",
              formatCo2(co2Kg, locale),
            )}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-emerald-950">{tree.localName}</h3>
            <p className="text-xs italic text-zinc-500">{tree.species}</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            {tree.code}
          </span>
        </div>
        {tree.location && (
          <p className="mt-2 text-sm text-zinc-600">📍 {labelLokasi(tree.location)}</p>
        )}
        {(tree.heightM || tree.diameterCm) && (
          <p className={`${tree.location ? "" : "mt-2"} text-sm text-zinc-600`}>
            📏 {tree.heightM ? `T ${tree.heightM} m` : ""}
            {tree.heightM && tree.diameterCm ? " · " : ""}
            {tree.diameterCm ? `Ø ${tree.diameterCm} cm` : ""}
          </p>
        )}
        <p className="mt-3 text-lg font-bold text-emerald-700">{rupiah(tree.priceIdr)}</p>
        <p className="text-xs text-zinc-500">{t.perYear}</p>
      </div>
      <CartMarker code={tree.code} />
    </Link>
  );
}
