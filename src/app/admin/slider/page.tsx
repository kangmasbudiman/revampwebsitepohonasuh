import Image from "next/image";
import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapSliders, type ApiSlider } from "@/lib/api";
import SliderForm from "@/components/admin/slider-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteSlider } from "@/lib/actions/slider";

export const metadata = { title: "Kelola Slider | Pohon Asuh" };

export default async function AdminSliderPage({
  searchParams,
}: PageProps<"/admin/slider">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let slides: ApiSlider[] = [];
  let fetchError = false;
  try {
    slides = mapSliders(await apiGet<Record<string, unknown>[]>("slider"));
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Kelola Slider</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {slides.length} slide — satu slider bersama untuk beranda web dan aplikasi mobile.
          </p>
        </div>
      </div>

      {sp?.saved && <Banner tone="ok">Perubahan slide tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Slide dihapus.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Slide
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <SliderForm />
        </div>
      </details>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data slider. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Gambar</th>
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Deskripsi</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {slides.map((slide, i) => (
              <tr key={slide.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                <td className="px-4 py-3">
                  {slide.imageUrl ? (
                    <Image
                      src={slide.imageUrl}
                      alt={slide.judul}
                      width={96}
                      height={48}
                      className="h-12 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🖼️</span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <span className="rounded-full bg-emerald-50 dark:bg-night-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    Slide {i + 1}
                  </span>
                  <p className="mt-1 line-clamp-2 font-medium text-emerald-900 dark:text-emerald-100">{slide.judul}</p>
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <p className="line-clamp-2 text-zinc-600 dark:text-zinc-300">{slide.deskripsi}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/slider/${slide.id}/edit`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <form action={deleteSlider}>
                      <input type="hidden" name="id" value={slide.id} />
                      <ConfirmSubmit
                        message={`Hapus slide "${slide.judul}"? Tindakan ini tidak bisa dibatalkan.`}
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {slides.length === 0 && !fetchError && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada slide — beranda akan memakai slide bawaan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Banner({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600 dark:text-red-400"
      }`}
    >
      {children}
    </p>
  );
}
