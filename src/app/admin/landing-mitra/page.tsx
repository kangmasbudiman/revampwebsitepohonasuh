import { requireAdminLevel } from "@/lib/guard";
import { apiGet, buktiUrl, mapMitraFaq } from "@/lib/api";
import {
  editFaqMitra,
  hapusFaqMitra,
  tambahFaqMitra,
  uploadHeroMitra,
} from "@/lib/actions/admin-landing-mitra";
import SuccessPopup from "@/components/admin/success-popup";
import { Image as ImageIcon, Plus, Trash2, UploadCloud } from "lucide-react";

export const metadata = { title: "Landing Mitra | Pohon Asuh" };

const inputCls =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-200";
const labelCls = "block text-xs font-medium text-zinc-700 dark:text-zinc-300";

export default async function AdminLandingMitraPage(props: PageProps<"/admin/landing-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let detail: { settings?: Record<string, string>; faqs?: Record<string, unknown>[] } = {};
  try {
    detail = await apiGet<{ settings?: Record<string, string>; faqs?: Record<string, unknown>[] }>(
      "mitralandingdetail",
    );
  } catch {
    detail = {};
  }
  const heroFile = String(detail?.settings?.hero_image ?? "");
  const heroUrl = heroFile ? buktiUrl(heroFile) : null;
  const faqs = (detail?.faqs ?? []).map(mapMitraFaq);

  return (
    <main className="w-full px-6 py-8 lg:px-8">
      <div className="flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:flex dark:bg-night-800 dark:text-emerald-300">
          <ImageIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 dark:text-white">Kelola Landing Mitra</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Ubah foto hero dan daftar FAQ pada halaman <strong>Kerjasama Mitra</strong>. Jika FAQ belum
            diisi, halaman memakai FAQ bawaan dari kamus bahasa.
          </p>
        </div>
      </div>

      {sp?.uploaded && <SuccessPopup paramKey="uploaded" title="Tersimpan">Foto hero berhasil diperbarui.</SuccessPopup>}
      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">FAQ berhasil disimpan.</SuccessPopup>}
      {sp?.deleted && <SuccessPopup paramKey="deleted" title="Dihapus">FAQ berhasil dihapus.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">Periksa kembali input Anda.</SuccessPopup>}

      {/* Hero */}
      <section className="mt-7 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm pa-card dark:border-night-700">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <UploadCloud className="h-3.5 w-3.5" /> Foto Hero
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-xl border border-emerald-100 bg-zinc-50 dark:border-night-700 dark:bg-night-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroUrl || "/images/hero-mitra.jpg"}
                alt="Pratinjau hero landing mitra"
                className="h-56 w-full object-cover"
              />
            </div>
            <p className="mt-2 font-mono text-[10px] text-zinc-400">
              {heroFile || "/images/hero-mitra.jpg (bawaan)"}
            </p>
          </div>
          <form action={uploadHeroMitra} className="space-y-4">
            <div>
              <label htmlFor="hero" className={labelCls}>Ganti foto hero</label>
              <label className="mt-1 block cursor-pointer rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-3 transition hover:border-emerald-400 dark:border-night-700 dark:bg-night-950/40">
                <span className="sr-only">Pilih foto hero</span>
                <input
                  id="hero"
                  type="file"
                  name="image"
                  accept="image/*"
                  required
                  className="w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 dark:text-zinc-300 dark:file:bg-emerald-600 dark:file:text-white"
                />
              </label>
              <p className="mt-2 text-[11px] text-zinc-400">PNG/JPG/WebP, maksimal 3MB.</p>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Simpan Foto Hero
            </button>
          </form>
        </div>
      </section>

      {/* Tambah FAQ */}
      <section className="mt-5 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm pa-card dark:border-night-700">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <Plus className="h-3.5 w-3.5" /> Tambah FAQ
        </div>
        <form action={tambahFaqMitra} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>Pertanyaan (ID)</label>
            <input name="pertanyaan_id" required className={inputCls} placeholder="Siapa yang bisa menjadi mitra?" />
          </div>
          <div>
            <label className={labelCls}>Pertanyaan (EN)</label>
            <input name="pertanyaan_en" className={inputCls} placeholder="Who can become a partner?" />
          </div>
          <div>
            <label className={labelCls}>Jawaban (ID)</label>
            <textarea name="jawaban_id" required rows={3} className={inputCls} placeholder="Jawaban dalam bahasa Indonesia" />
          </div>
          <div>
            <label className={labelCls}>Jawaban (EN)</label>
            <textarea name="jawaban_en" rows={3} className={inputCls} placeholder="Answer in English" />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-24">
              <label className={labelCls}>Urutan</label>
              <input name="urutan" type="number" defaultValue={faqs.length + 1} className={inputCls} />
            </div>
            <button
              type="submit"
              className="mb-0.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Tambah FAQ
            </button>
          </div>
        </form>
      </section>

      {/* Daftar FAQ */}
      <section className="mt-5 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm pa-card dark:border-night-700">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-emerald-950 dark:text-white">Daftar FAQ ({faqs.length})</h2>
          <p className="text-[11px] text-zinc-400">Klik item untuk mengubah</p>
        </div>
        {faqs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-emerald-200 p-6 text-center text-sm text-zinc-500 dark:border-night-700">
            Belum ada FAQ khusus — landing page memakai FAQ bawaan.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {faqs.map((f, i) => (
              <details key={f.id} className="rounded-xl border border-emerald-100 p-4 dark:border-night-700">
                <summary className="cursor-pointer text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  {i + 1}. {f.pertanyaanId}
                </summary>
                <form action={editFaqMitra} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={f.id} />
                  <div>
                    <label className={labelCls}>Pertanyaan (ID)</label>
                    <input name="pertanyaan_id" defaultValue={f.pertanyaanId} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Pertanyaan (EN)</label>
                    <input name="pertanyaan_en" defaultValue={f.pertanyaanEn} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Jawaban (ID)</label>
                    <textarea name="jawaban_id" defaultValue={f.jawabanId} rows={3} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Jawaban (EN)</label>
                    <textarea name="jawaban_en" defaultValue={f.jawabanEn} rows={3} className={inputCls} />
                  </div>
                  <div className="flex flex-wrap items-end gap-2 md:col-span-2">
                    <div className="w-24">
                      <label className={labelCls}>Urutan</label>
                      <input name="urutan" type="number" defaultValue={f.urutan} className={inputCls} />
                    </div>
                    <button type="submit" className="mb-0.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                      Simpan
                    </button>
                    <button
                      formAction={hapusFaqMitra}
                      type="submit"
                      className="mb-0.5 inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  </div>
                </form>
              </details>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
