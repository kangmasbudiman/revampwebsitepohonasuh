import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapLokasi, type ApiLokasi } from "@/lib/api";
import LokasiForm from "@/components/admin/lokasi-form";

export const metadata = { title: "Edit Lokasi | Pohon Asuh" };

export default async function EditLokasiPage(props: PageProps<"/admin/lokasi/[id]/edit">) {
  await requireAdminLevel();
  const { id } = await props.params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) notFound();

  let row: ApiLokasi | null = null;
  try {
    const rows = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapLokasi);
    row = rows.find((r) => r.id === rowId) ?? null;
  } catch {
    row = null;
  }
  if (!row) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/lokasi" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Data Lokasi
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">Edit Lokasi</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {row.label || row.nama} · {row.total} pohon · {row.kecamatan || "kecamatan —"}{" "}
        {row.kabupaten || "kabupaten —"} {row.provinsi || ""}
      </p>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
        <LokasiForm lokasi={row} />
      </div>
    </main>
  );
}
