import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapTemplatesertifikatList } from "@/lib/api";
import TemplateForm from "@/components/admin/template-form";

export const metadata = { title: "Edit Template Sertifikat | Pohon Asuh" };

export default async function EditTemplatePage(
  props: PageProps<"/admin/template-sertifikat/[id]/edit">,
) {
  await requireAdminLevel();
  const { id } = await props.params;
  const tplId = Number(id);
  if (!Number.isInteger(tplId) || tplId <= 0) notFound();

  // endpoint templatelist hanya menyediakan daftar penuh — cari barisnya
  let template = null;
  try {
    const rows = await apiGet<Record<string, unknown>[]>("templatelist");
    template = mapTemplatesertifikatList(rows).find((t) => t.id === tplId) ?? null;
  } catch {
    template = null;
  }
  if (!template) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href="/admin/template-sertifikat"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        ← Template Sertifikat
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">
        Edit Template <span className="text-emerald-600">#{template.id}</span>
      </h1>

      {template.imageUrl && (
        <div className="relative mt-4 aspect-[828/585.6] w-full max-w-xl overflow-hidden rounded-2xl bg-emerald-50 dark:bg-night-800">
          <Image
            src={template.imageUrl}
            alt={template.nama}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <TemplateForm template={template} />
      </div>
    </main>
  );
}
