import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { apiPost, mapTree, mapTrees, slugify, type ApiTree } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import StatusBadge from "@/components/status-badge";
import TreeCard from "@/components/tree-card";
import AdoptPanel from "@/components/adopt-panel";

export default async function TreeDetailPage(props: PageProps<"/pohon/[code]">) {
  const { code } = await props.params;
  const session = await getSession();

  let tree: ApiTree | null = null;
  let others: ApiTree[] = [];
  let galeri: string[] = [];
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
  } catch {
    // biarkan notFound di bawah yang menangani
  }
  if (!tree) notFound();

  const specs = [
    { label: "Diameter", value: tree.diameterCm ? `${tree.diameterCm} cm` : "—" },
    { label: "Tinggi", value: tree.heightM ? `${tree.heightM} m` : "—" },
    { label: "Keliling Batang", value: tree.kelilingCm ? `${tree.kelilingCm} cm` : "—" },
    { label: "Kode Pohon", value: tree.code },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/pohon" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        ← Kembali ke Data Pohon
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative h-80 overflow-hidden rounded-3xl bg-emerald-50 sm:h-96">
          {tree.photoUrl ? (
            <Image
              src={tree.photoUrl}
              alt={tree.localName}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl">🌳</div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-3">
            <StatusBadge {...(tree.status === "AVAILABLE"
              ? { label: "Tersedia", className: "bg-emerald-100 text-emerald-800" }
              : tree.status === "RESERVED"
                ? { label: "Dipesan", className: "bg-amber-100 text-amber-800" }
                : { label: "Teradopsi", className: "bg-zinc-100 text-zinc-600" })} />
            <Link
              href={`/lokasi/${slugify(tree.desa)}`}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              📍 {tree.desa}
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
              <span className="text-sm text-zinc-600">Biaya adopsi</span>
              <span className="text-2xl font-bold text-emerald-700">{rupiah(tree.priceIdr)}</span>
            </div>
            <p className="mt-1 text-right text-xs text-zinc-500">per tahun</p>
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
                  Pohon ini sedang tidak tersedia untuk adopsi.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {galeri.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-emerald-950">Galeri Pohon</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {galeri.map((u, i) => (
              <a
                key={`${u}-${i}`}
                href={u}
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-2xl bg-emerald-50"
              >
                <Image
                  src={u}
                  alt={`Galeri ${tree.localName} ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-emerald-950">
            Pohon lain di {tree.desa}
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
