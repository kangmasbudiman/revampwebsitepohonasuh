import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet, mapMitra, mapProgramMitra, type ApiMitra, type ApiProgramMitra } from "@/lib/api";
import MitraAdopsiKonsepForm from "@/components/admin/mitra-adopsi-konsep-form";

export const metadata = { title: "Input Adopsi Mitra | Pohon Asuh" };

export default async function AdminAdopsiMitraPage(props: PageProps<"/admin/adopsi-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let mitras: ApiMitra[] = [];
  let programs: ApiProgramMitra[] = [];
  let fetchError = false;
  try {
    mitras = (await apiGet<Record<string, unknown>[]>("mitralist")).map(mapMitra);
    const prows = await apiGet<Record<string, unknown>[]>("programmitralist");
    programs = prows.map(mapProgramMitra);
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Input Adopsi Mitra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Input data pengadopsi dari mitra (mis. Jejakin). Pohon harus sudah
        ditahan untuk mitra terlebih dahulu. <strong>Email pengadopsi wajib diisi</strong> —
        satu pengadopsi bisa mengadopsi lebih dari satu pohon (isi nama &amp; email
        yang sama untuk beberapa kode pohon).
      </p>

      {sp?.sukses && (
        <SuccessPopup paramKey="sukses" title="Adopsi Mitra Tercatat">
          {Number(sp.jumlah) || 0} adopsi mitra dicatat
          {sp.invoice ? ` — invoice ${String(sp.invoice)}` : ""}.
          {Number(sp.dilewati) > 0 && ` ${Number(sp.dilewati)} dilewati.`}
        </SuccessPopup>
      )}
      {sp?.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.error)}
        </SuccessPopup>
      )}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat mitra.</p>
      ) : mitras.length === 0 ? (
        <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Belum ada mitra. Tambahkan di <a href="/admin/mitra" className="underline">/admin/mitra</a> terlebih dahulu.
        </p>
      ) : (
        <MitraAdopsiKonsepForm mitras={mitras} programs={programs} />
      )}
    </main>
  );
}
