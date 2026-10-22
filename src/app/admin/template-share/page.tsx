import Image from "next/image";
import SuccessPopup from "@/components/admin/success-popup";
import Link from "next/link";
import { requireAdmin } from "@/lib/guard";
import {
  apiGet,
  mapDesa,
  mapPenugasan,
  mapTemplateShareList,
  type ApiTemplateShare,
} from "@/lib/api";
import TemplateShareForm from "@/components/admin/template-share-form";
import TemplateSharePreview from "@/components/admin/template-share-preview";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteTemplateShare } from "@/lib/actions/template-share";

export const metadata = { title: "Template Share | Pohon Asuh" };

export default async function AdminTemplateSharePage({
  searchParams,
}: PageProps<"/admin/template-share">) {
  const session = await requireAdmin();
  const petugas = (session.level ?? 1) === 2;
  const sp = await searchParams;

  let templates: ApiTemplateShare[] = [];
  let fetchError = false;
  try {
    templates = mapTemplateShareList(
      await apiGet<Record<string, unknown>[]>(
        petugas ? `templatesharelist?idpetugas=${session.userId}` : "templatesharelist",
      ),
    );
  } catch {
    fetchError = true;
  }

  // Opsi desa form: admin = semua desa; petugas = desa yang ditugaskan.
  let desaOptions: string[] = [];
  try {
    if (petugas) {
      const penugasan = mapPenugasan(await apiGet<Record<string, unknown>>("penugasandesa"));
      desaOptions = (penugasan.petugas.find((p) => p.id === session.userId)?.desaList ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    } else {
      const rows = await apiGet<Record<string, unknown>[]>("getdesa");
      desaOptions = rows.map(mapDesa).map((d) => d.name).filter(Boolean);
    }
  } catch {
    desaOptions = [];
  }

  const perDesa = new Map<string, ApiTemplateShare[]>();
  for (const tpl of templates) {
    const list = perDesa.get(tpl.desa) ?? [];
    list.push(tpl);
    perDesa.set(tpl.desa, list);
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Template Share</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {templates.length} template — latar design &ldquo;Bagikan Aksi Saya&rdquo; per desa.
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
            Rasio story <strong>1080×1920</strong> (9:16) — gambar beda rasio akan terpotong
            (<code>object-cover</code>).
          </li>
          <li>JPG/PNG/WebP, maksimal 2MB.</li>
          <li>
            Template adalah <strong>design fill-in</strong>: header logo, garis putus,
            3 kartu statistik (pohon/lokasi/tahun), kartu &ldquo;Pesan untuk Hutan&rdquo;,
            dan caption penutup digambar di template; teks dinamis diisi sistem di zona
            tetap — nama donatur di ±27%, kalimat &ldquo;Menghadiahkan pohon … untuk&rdquo;
            di ±28-33%, nama penerima hadiah di ±39%, nilai kartu (jumlah pohon / desa +
            subtext / durasi tahun) di ±50-56%, memo tulisan tangan di ±65-73%.
            Sisakan zona tersebut kosong/tenang.
          </li>
          <li>Satu template per desa bisa ditandai utama — jadi pilihan awal pengadopsi.</li>
          <li>Desa tanpa template aktif memakai latar gradasi bawaan.</li>
        </ul>
      </div>

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Template
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <TemplateShareForm desaOptions={desaOptions} />
        </div>
      </details>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data template. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      {[...perDesa.entries()].map(([desa, rows]) => (
        <section key={desa} className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {desa}
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
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
                {rows.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                    <td className="px-4 py-3">
                      {tpl.imageUrl ? (
                        <div className="relative aspect-[9/16] w-20 overflow-hidden rounded-lg">
                          <Image
                            src={tpl.imageUrl}
                            alt={tpl.nama}
                            fill
                            sizes="80px"
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
                        <TemplateSharePreview nama={tpl.nama} desa={tpl.desa} imageUrl={tpl.imageUrl} subtext={tpl.subtext} />
                        <Link
                          href={`/admin/template-share/${tpl.id}/edit`}
                          className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                        >
                          Edit
                        </Link>
                        <form action={deleteTemplateShare}>
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
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {templates.length === 0 && !fetchError && (
        <p className="mt-8 rounded-xl bg-zinc-50 dark:bg-night-800/50 px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Belum ada template — semua design share memakai latar bawaan.
        </p>
      )}
    </main>
  );
}

