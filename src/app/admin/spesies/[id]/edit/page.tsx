import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapSpeciesDetail } from "@/lib/api";
import SpeciesForm from "@/components/admin/species-form";

export const metadata = { title: "Edit Spesies | Pohon Asuh" };

export default async function EditSpeciesPage(props: PageProps<"/admin/spesies/[id]/edit">) {
  await requireAdminLevel();
  const { id } = await props.params;
  const speciesId = Number(id);
  if (!Number.isInteger(speciesId) || speciesId <= 0) notFound();

  let species = null;
  try {
    const row = await apiGet<Record<string, unknown> | null>(`speciesdetail/${speciesId}`);
    species = row ? mapSpeciesDetail(row) : null;
  } catch {
    species = null;
  }
  if (!species) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/spesies" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Spesies
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">
        Edit Spesies — <span className="italic">{species.namaLatin}</span>
      </h1>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <SpeciesForm species={species} />
      </div>
    </main>
  );
}
