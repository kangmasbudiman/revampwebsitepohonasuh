import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapSliders } from "@/lib/api";
import SliderForm from "@/components/admin/slider-form";

export const metadata = { title: "Edit Slide | Pohon Asuh" };

export default async function EditSliderPage(props: PageProps<"/admin/slider/[id]/edit">) {
  await requireAdminLevel();
  const { id } = await props.params;
  const slideId = Number(id);
  if (!Number.isInteger(slideId) || slideId <= 0) notFound();

  // endpoint slider hanya menyediakan daftar penuh — cari barisnya di situ
  let slide = null;
  try {
    const rows = await apiGet<Record<string, unknown>[]>("slider");
    slide = mapSliders(rows).find((s) => s.id === slideId) ?? null;
  } catch {
    slide = null;
  }
  if (!slide) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/slider" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Slider
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">
        Edit Slide <span className="text-emerald-600">#{slide.id}</span>
      </h1>

      {slide.imageUrl && (
        <div className="relative mt-4 h-40 w-full overflow-hidden rounded-2xl bg-emerald-50 dark:bg-night-800">
          <Image
            src={slide.imageUrl}
            alt={slide.judul}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <SliderForm slide={slide} />
      </div>
    </main>
  );
}
