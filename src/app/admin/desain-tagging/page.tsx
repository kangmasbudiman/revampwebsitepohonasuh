import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapTaggingTemplate } from "@/lib/api";
import {
  aktifkanTaggingTemplateDesign,
  hapusTaggingTemplateDesign,
  uploadTaggingTemplateDesign,
} from "@/lib/actions/admin-desain-tagging";
import SuccessPopup from "@/components/admin/success-popup";
import { Check, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";

export const metadata = { title: "Desain Tagging | Pohon Asuh" };

export default async function AdminDesainTaggingPage(props: PageProps<"/admin/desain-tagging">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let designs: ReturnType<typeof mapTaggingTemplate>[] = [];
  try {
    designs = (await apiGet<Record<string, unknown>[]>("taggingtemplatelist")).map(mapTaggingTemplate);
  } catch {
    designs = [];
  }

  return (
    <main className="w-full px-6 py-8 lg:px-8">
      <div className="flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:flex dark:bg-night-800 dark:text-emerald-300">
          <ImageIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 dark:text-white">Desain Tagging Pengadopsi</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Kelola desain papan tagging & sertifikat untuk pengadopsi biasa. Desain mitra/program
            memiliki prioritas lebih tinggi dan tidak terpengaruh oleh halaman ini.
          </p>
        </div>
      </div>

      {sp?.uploaded && <SuccessPopup paramKey="uploaded" title="Tersimpan">Desain tagging berhasil ditambahkan.</SuccessPopup>}
      {sp?.activated && <SuccessPopup paramKey="activated" title="Diaktifkan">Desain tagging sekarang dipakai pengadopsi biasa.</SuccessPopup>}
      {sp?.deleted && <SuccessPopup paramKey="deleted" title="Dihapus">Desain tagging berhasil dihapus.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {/* Upload */}
        <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm pa-card dark:border-night-700">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <UploadCloud className="h-3.5 w-3.5" /> Tambah Desain
          </div>
          <form action={uploadTaggingTemplateDesign} className="mt-4 space-y-4">
            <div>
              <label htmlFor="nama" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nama desain (opsional)
              </label>
              <input
                id="nama"
                name="nama"
                placeholder="Mis. Desain HUT 2026"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-200"
              />
            </div>
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                File gambar
              </label>
              <label className="mt-1 block cursor-pointer rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-3 transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-night-700 dark:bg-night-950/40">
                <span className="sr-only">Pilih file desain</span>
                <input
                  id="image"
                  type="file"
                  name="image"
                  accept="image/*"
                  required
                  className="w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 dark:text-zinc-300 dark:file:bg-emerald-600 dark:file:text-white"
                />
              </label>
              <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">PNG/JPG/WebP, maksimal 2MB.</p>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Upload Desain
            </button>
          </form>
        </section>

        {/* Daftar desain */}
        <section className="lg:col-span-2">
          {designs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center dark:border-night-700 dark:bg-night-950/40">
              <ImageIcon className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                Belum ada desain. Upload desain pertama untuk pengadopsi biasa.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {designs.map((d) => (
                <article
                  key={d.id}
                  className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm pa-card dark:border-night-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-emerald-950 dark:text-white">{d.nama || d.file}</h2>
                      <p className="truncate font-mono text-[10px] text-zinc-400">{d.file}</p>
                    </div>
                    {d.aktif && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Check className="h-3 w-3" /> Aktif
                      </span>
                    )}
                  </div>
                  {d.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-50 bg-zinc-50 dark:border-night-800 dark:bg-night-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.imageUrl} alt={d.nama} className="h-32 w-full object-contain" />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!d.aktif && (
                      <form action={aktifkanTaggingTemplateDesign}>
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Aktifkan
                        </button>
                      </form>
                    )}
                    <form action={hapusTaggingTemplateDesign}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
