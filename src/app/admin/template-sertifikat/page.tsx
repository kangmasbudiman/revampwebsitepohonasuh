import Image from "next/image";
import SuccessPopup from "@/components/admin/success-popup";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapTemplatesertifikatList, type ApiTemplateSertifikat } from "@/lib/api";
import TemplateForm from "@/components/admin/template-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteTemplate } from "@/lib/actions/template";

export const metadata = { title: "Template Sertifikat | Pohon Asuh" };

export default async function AdminTemplateSertifikatPage({
  searchParams,
}: PageProps<"/admin/template-sertifikat">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let templates: ApiTemplateSertifikat[] = [];
  let fetchError = false;
  try {
    templates = mapTemplatesertifikatList(
      await apiGet<Record<string, unknown>[]>("templatelist"),
    );
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Template Sertifikat</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {templates.length} template — donatur memilih latar saat membagikan sertifikatnya.
          </p>
        </div>
      </div>

      {sp?.saved && (
        <SuccessPopup paramKey="saved" title="Tersimpan">
          Perubahan template tersimpan.
        </SuccessPopup>
      )}
      {sp?.created && (
        <SuccessPopup paramKey="created" title="Ditambahkan">
          Template ditambahkan.
        </SuccessPopup>
      )}
      {sp?.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          Template dihapus.
        </SuccessPopup>
      )}
      {sp?.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.error)}
        </SuccessPopup>
      )}

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 dark:border-night-700 dark:bg-night-800/50 p-5 text-sm text-zinc-600 dark:text-zinc-300">
        <p className="font-semibold text-emerald-800 dark:text-emerald-200">Panduan desain template</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Posisi, ukuran, dan warna teks sertifikat <strong>tidak berubah</strong> — desain harus
            menyisakan zona teks kosong pada posisi yang sama dengan template bawaan.{" "}
            <Link
              href="/images/sertifikat/bg.png"
              download
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh contoh bg.png
            </Link>
          </li>
          <li>
            Rasio A4 lanskap <strong>828:585,6</strong> — gambar beda rasio akan terpotong
            (<code>object-cover</code>).
          </li>
          <li>
            JPG/PNG/WebP, maksimal 2MB — untuk 300dpi sebaiknya ekspor sebagai JPG (PNG 300dpi
            bisa melebihi 2MB).
          </li>
          <li>
            Template yang dihapus/nonaktif membuat tautan lama otomatis kembali ke template utama
            atau latar bawaan.
          </li>
        </ul>
      </div>

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Template
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <TemplateForm />
        </div>
      </details>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data template. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Pratinjau</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {templates.map((tpl) => (
              <tr key={tpl.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                <td className="px-4 py-3">
                  {tpl.imageUrl ? (
                    <div className="relative aspect-[828/585.6] w-40 overflow-hidden rounded-lg">
                      <Image
                        src={tpl.imageUrl}
                        alt={tpl.nama}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-2xl">🖼️</span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <p className="font-medium text-emerald-900 dark:text-emerald-100">{tpl.nama}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{tpl.file}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    {tpl.utama && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Utama
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        tpl.aktif
                          ? "bg-emerald-50 text-emerald-600 dark:bg-night-800"
                          : "bg-zinc-100 text-zinc-400 dark:bg-night-900 dark:text-zinc-500"
                      }`}
                    >
                      {tpl.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/template-sertifikat/${tpl.id}/edit`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <form action={deleteTemplate}>
                      <input type="hidden" name="id" value={tpl.id} />
                      <ConfirmSubmit
                        message={`Hapus template "${tpl.nama}"? Tautan yang memakai template ini otomatis kembali ke template utama/bawaan.`}
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && !fetchError && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada template — semua sertifikat memakai latar bawaan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

