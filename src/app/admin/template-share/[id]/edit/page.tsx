import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapTemplateShareList } from "@/lib/api";
import TemplateShareForm from "@/components/admin/template-share-form";
import { ShareDesignSample } from "@/components/admin/template-share-preview";

export const metadata = { title: "Edit Template Share | Pohon Asuh" };

export default async function EditTemplateSharePage(
  props: PageProps<"/admin/template-share/[id]/edit">,
) {
  const session = await requireAdmin();
  const petugas = (session.level ?? 1) === 2;
  const { id } = await props.params;
  const tplId = Number(id);
  if (!Number.isInteger(tplId) || tplId <= 0) notFound();

  // endpoint templatesharelist hanya menyediakan daftar penuh — cari barisnya
  // (petugas: daftar sudah difilter server-side per idpetugas).
  let template = null;
  try {
    const rows = await apiGet<Record<string, unknown>[]>(
      petugas ? `templatesharelist?idpetugas=${session.userId}` : "templatesharelist",
    );
    template = mapTemplateShareList(rows).find((t) => t.id === tplId) ?? null;
  } catch {
    template = null;
  }
  if (!template) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href="/admin/template-share"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        ← Template Share
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">
        Edit Template <span className="text-emerald-600">#{template.id}</span>
      </h1>

      {template.imageUrl && (
        <div className="mt-4 w-48 overflow-hidden rounded-2xl">
          <ShareDesignSample desa={template.desa} imageUrl={template.imageUrl} subtext={template.subtext} className="w-full" />
        </div>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <TemplateShareForm desaOptions={[template.desa]} template={template} />
      </div>
    </main>
  );
}
