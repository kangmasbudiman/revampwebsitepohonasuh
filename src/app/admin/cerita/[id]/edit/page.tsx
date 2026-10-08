import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapCeritas, type ApiCerita } from "@/lib/api";
import CeritaForm from "@/components/admin/cerita-form";

export const metadata = { title: "Edit Cerita Dampak | Pohon Asuh" };

export default async function EditCeritaPage(props: PageProps<"/admin/cerita/[id]/edit">) {
  await requireAdminLevel();
  const { id } = await props.params;
  const ceritaId = Number(id);
  if (!Number.isInteger(ceritaId) || ceritaId <= 0) notFound();

  let cerita: ApiCerita | null = null;
  try {
    const rows = mapCeritas(await apiGet<Record<string, unknown>[]>("ceritalist"));
    cerita = rows.find((c) => c.id === ceritaId) ?? null;
  } catch {
    cerita = null;
  }
  if (!cerita) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/cerita" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Cerita Dampak
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">Edit Cerita</h1>

      <div className="mt-6 grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
          <CeritaForm cerita={cerita} />
        </div>
        {cerita.fotoUrl && (
          <aside className="h-fit rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Foto Saat Ini</p>
            <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-emerald-50">
              <Image src={cerita.fotoUrl} alt={cerita.judul} fill sizes="260px" className="object-cover" />
            </div>
            <p className="mt-2 text-xs text-zinc-400">Unggah foto baru untuk mengganti.</p>
          </aside>
        )}
      </div>
    </main>
  );
}
