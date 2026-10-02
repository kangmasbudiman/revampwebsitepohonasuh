import Link from "next/link";
import Image from "next/image";
import StatusBadge from "@/components/status-badge";
import AddToCartButton from "@/components/add-to-cart-button";
import { rupiah, TREE_STATUS } from "@/lib/format";

type TreeCardProps = {
  tree: {
    code: string;
    localName: string;
    species: string | null;
    priceIdr: number;
    status: string;
    photoUrl: string | null;
    desa?: string | null;
    location?: { name: string } | null;
  };
};

export default function TreeCard({ tree }: TreeCardProps) {
  const status = TREE_STATUS[tree.status] ?? { label: tree.status, className: "bg-zinc-100 text-zinc-600" };

  return (
    <Link
      href={`/pohon/${tree.code}`}
      className="group block h-full overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
          <StatusBadge {...status} />
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
        {tree.location && <p className="mt-2 text-sm text-zinc-600">📍 {tree.location.name}</p>}
        <p className="mt-3 text-lg font-bold text-emerald-700">{rupiah(tree.priceIdr)}</p>
        <p className="text-xs text-zinc-500">per tahun</p>
      </div>
    </Link>
  );
}
