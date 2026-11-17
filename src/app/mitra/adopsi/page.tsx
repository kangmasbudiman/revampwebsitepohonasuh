import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapProgramMitra } from "@/lib/api";
import MitraAdopsiForm from "@/components/admin/mitra-adopsi-form";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Input Adopsi Mitra | Pohon Asuh" };

export default async function MitraAdopsiPage(props: PageProps<"/mitra/adopsi">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  let programs: { id: number; nama: string; mitraId: number }[] = [];
  try {
    const res = await apiPost<{
      value?: number;
      mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null };
      member: { id: number; name: string; emaile: string };
    }>("mitramyinfo", { idmember: session.userId });
    if (Number(res.value) === 200) {
      mitraId = Number(res.mitra.id);
      mitraName = String(res.mitra.nama);
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra).map((p) => ({ id: p.id, nama: p.nama, mitraId: p.mitraId }));
    }
  } catch {
    // bukan mitra
  }
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Input Adopsi Mitra</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Mitra: <strong>{mitraName}</strong>. Input data pengadopsi dari jaringan Anda. Pohon harus sudah ditahan (status Dipesan Mitra) terlebih dahulu. <strong>Data pengadopsi diverifikasi admin terlebih dahulu — sertifikat terbit setelah diverifikasi.</strong>
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Tercatat Menunggu Verifikasi">{Number(sp.jumlah) || 0} adopsi dicatat — menunggu verifikasi admin, sertifikat terbit setelah diverifikasi.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-6">
        <MitraAdopsiForm mitras={[{ id: mitraId!, nama: mitraName }]} programs={programs} selfMode />
      </div>
    </main>
  );
}
