import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, taggingTemplateUrl, mapProgramMitra, type ApiProgramMitra } from "@/lib/api";
import { setTaggingProgramMitra, setTemplateTaggingMitra } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";
import TaggingUploadForm from "@/components/mitra/tagging-upload-form";
import { CalendarDays, Image as ImageIcon, Layers3 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Desain Tagging | Pohon Asuh" };

const TEMPLATE_STANDAR = "/images/papan-taging.png";

export default async function MitraDesainTaggingPage(props: PageProps<"/mitra/desain-tagging">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null, mitraName = "";
  let programs: ApiProgramMitra[] = [];
  try {
    const info = await apiPost<{ value?: number; mitra?: { id: number; nama: string } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama ?? "");
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra);
    }
  } catch {}
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <main className="w-full px-6 py-8 lg:px-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:flex dark:bg-night-800 dark:text-emerald-300">
          <ImageIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 dark:text-white">Desain Tagging Program</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Mitra: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{mitraName}</strong>. Unggah desain
            banner/tagging per program yang akan dipakai saat menerbitkan sertifikat & papan tagging.
          </p>
        </div>
      </div>

      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">Desain tagging berhasil diunggah.</SuccessPopup>}
      {sp?.template && <SuccessPopup paramKey="template" title="Template Dipilih">Template tagging tersimpan.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {programs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-10 text-center dark:border-night-700 dark:bg-night-950/40">
          <ImageIcon className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Belum ada program. Buat di <Link href="/mitra/program" className="font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">Program Saya</Link>.
          </p>
        </div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {programs.map((p) => {
            const isCustom = !!p.taggingTemplate && p.taggingTemplate !== TEMPLATE_STANDAR;
            return (
              <article
                key={p.id}
                className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:shadow-md pa-card dark:border-night-700"
              >
                {/* Head */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-emerald-950 dark:text-white">{p.nama}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {p.tglMulai ?? "—"} <span className="text-zinc-400">→</span> {p.tglSelesai ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      isCustom
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-night-800 dark:text-zinc-400"
                    }`}
                  >
                    {isCustom ? "Custom" : "Standar"}
                  </span>
                </div>

                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Tagging saat ini:{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {isCustom ? p.taggingTemplate : "desain standar"}
                  </span>
                </p>

                {isCustom && taggingTemplateUrl(p.taggingTemplate) && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-emerald-100 bg-zinc-50 dark:border-night-700 dark:bg-night-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={taggingTemplateUrl(p.taggingTemplate)!}
                      alt="Pratinjau desain tagging tersimpan"
                      className="h-36 w-full object-contain"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-50 px-3 py-2 dark:border-night-800">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Pratinjau desain tersimpan
                      </p>
                      <form action={setTemplateTaggingMitra}>
                        <input type="hidden" name="program_id" value={p.id} />
                        <input type="hidden" name="template" value={p.taggingTemplate ?? ""} />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Aktifkan desain ini
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-5 border-t border-emerald-50 pt-5 dark:border-night-800">
                  {/* Template standar */}
                  <form action={setTemplateTaggingMitra}>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      <Layers3 className="h-3.5 w-3.5" /> Template Bawaan
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input type="hidden" name="program_id" value={p.id} />
                      <select
                        name="template"
                        defaultValue={TEMPLATE_STANDAR}
                        className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none dark:border-night-700 dark:bg-night-950 dark:text-zinc-200"
                      >
                        <option value={TEMPLATE_STANDAR}>Template Standar</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Gunakan Template
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                      Kembalikan tagging program ke desain bawaan.
                    </p>
                  </form>

                  {/* Custom desain */}
                  <TaggingUploadForm programId={p.id} action={setTaggingProgramMitra} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
