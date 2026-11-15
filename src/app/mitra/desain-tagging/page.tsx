import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapProgramMitra, type ApiProgramMitra } from "@/lib/api";
import { setTaggingProgramMitra, setTemplateTaggingMitra } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";
import Link from "next/link";

export const metadata = { title: "Desain Tagging | Pohon Asuh" };

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
      <h1 className="text-2xl font-bold text-emerald-950">Desain Tagging Program</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Mitra: <strong>{mitraName}</strong>. Unggah desain banner/tagging per program yang akan dipakai
        saat menerbitkan sertifikat & papan tagging.
      </p>

      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">Desain tagging berhasil diunggah.</SuccessPopup>}
      {sp?.template && <SuccessPopup paramKey="template" title="Template Dipilih">Template tagging tersimpan.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {programs.map((p) => (
          <div key={p.id} className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
            <h2 className="font-semibold text-emerald-900">{p.nama}</h2>
            <p className="mt-1 text-xs text-zinc-500">{p.tglMulai ?? "—"} → {p.tglSelesai ?? "—"}</p>
            <p className="mt-1 text-xs text-zinc-500">Tagging saat ini: {p.taggingTemplate ?? "desain standar"}</p>

            {/* Template */}
            <form action={setTemplateTaggingMitra} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="program_id" value={p.id} />
              <select name="template" defaultValue="/images/papan-taging.png" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
                <option value="/images/papan-taging.png">Template Standar</option>
              </select>
              <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                Gunakan Template
              </button>
            </form>

            {/* Custom Desain */}
            <form action={setTaggingProgramMitra} className="mt-3 space-y-2 border-t border-emerald-50 pt-3">
              <p className="text-xs font-medium text-zinc-700">Custom Desain</p>
              <input type="hidden" name="program_id" value={p.id} />
              <input type="file" name="file" accept="image/*" required className="w-full text-sm" />
              <button type="submit" className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800">
                Upload Desain
              </button>
            </form>
          </div>
        ))}
        {programs.length === 0 && <p className="col-span-2 text-center text-sm text-zinc-500">Belum ada program. Buat di <Link href="/mitra/program" className="underline">Program Saya</Link>.</p>}
      </div>
    </main>
  );
}
