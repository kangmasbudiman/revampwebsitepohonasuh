import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapAdopsis, type ApiAdopsi } from "@/lib/api";
import { namaDesa } from "@/lib/format";
import AdopsiForm from "@/components/admin/adopsi-form";

export const metadata = { title: "Edit Data Adopsi | Pohon Asuh" };

export default async function EditAdopsiPage(props: PageProps<"/admin/adopsi/[id]/edit">) {
  await requireAdminLevel();
  const { id } = await props.params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) notFound();

  let row: ApiAdopsi | null = null;
  try {
    const rows = mapAdopsis(await apiGet<Record<string, unknown>[]>("adopsilist"));
    row = rows.find((r) => r.id === rowId) ?? null;
  } catch {
    row = null;
  }
  if (!row) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/adopsi" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Data Adopsi
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">Edit Data Adopsi</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Baris #{row.id} · pohon {row.idpohon} · {namaDesa(row.desa)}
      </p>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
        <AdopsiForm row={row} />
      </div>
    </main>
  );
}
