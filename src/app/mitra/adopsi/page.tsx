import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import MitraAdopsiForm from "@/components/admin/mitra-adopsi-form";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Input Adopsi Mitra | Pohon Asuh" };

export default async function MitraAdopsiPage(props: PageProps<"/mitra/adopsi">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  try {
    const res = await apiPost<{
      value?: number;
      mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null };
      member: { id: number; name: string; emaile: string };
    }>("mitramyinfo", { idmember: session.userId });
    if (Number(res.value) === 200) {
      mitraId = Number(res.mitra.id);
      mitraName = String(res.mitra.nama);
    }
  } catch {
    // bukan mitra
  }
  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Input Adopsi Mitra</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Mitra: <strong>{mitraName}</strong>. Input data pengadopsi dari jaringan
        Anda. Pohon harus sudah ditahan (status Dipesan Mitra) terlebih dahulu.
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Tercatat">{Number(sp.jumlah) || 0} adopsi dicatat{sp.invoice ? ` — invoice ${String(sp.invoice)}` : ""}.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-6">
        <MitraAdopsiForm mitras={[{ id: mitraId!, nama: mitraName }]} />
      </div>
    </main>
  );
}
