import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapDesa, mapProgramMitra, type ApiDesa, type ApiProgramMitra } from "@/lib/api";
import SuccessPopup from "@/components/admin/success-popup";
import MitraPohonOrderForm from "@/components/mitra/mitra-pohon-order-form";

export const metadata = { title: "Pemesanan Pohon | Pohon Asuh" };

export default async function MitraPesananPage(props: PageProps<"/mitra/pesanan">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let mitraId: number | null = null;
  let mitraName = "";
  let aktif = 1;
  let programs: ApiProgramMitra[] = [];
  let desas: ApiDesa[] = [];

  try {
    const info = await apiPost<{
      value?: number;
      mitra?: { id: number; nama: string; aktif: number };
    }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) {
      mitraId = Number(info.mitra?.id);
      mitraName = String(info.mitra?.nama);
      aktif = Number(info.mitra?.aktif ?? 1);
      const prows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${mitraId}`);
      programs = prows.map(mapProgramMitra).filter((p) => p.aktif);
    }
  } catch {}

  try {
    desas = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    desas = [];
  }

  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Pemesanan Pohon</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Mitra: <strong>{mitraName}</strong>. Pilih program — detail program (provinsi, jumlah pohon, masa program) tampil
        otomatis — lalu kirim untuk diverifikasi admin.
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Pesanan Terkirim">Permintaan pemesanan terkirim. Admin akan memeriksa & menyetujui.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {aktif === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-center text-sm text-amber-800">
          Akun Anda menunggu aktivasi admin — belum bisa mengajukan pesanan.
        </div>
      ) : (
        <MitraPohonOrderForm
          desas={desas}
          programs={programs}
          desaActive={typeof sp?.desa === "string" ? sp.desa.trim() : ""}
        />
      )}

      <p className="mt-6 text-center text-xs text-zinc-400">Pantau semua permintaan pohon Anda di menu <a href="/mitra/riwayat-pesanan" className="font-semibold text-emerald-700 hover:underline">Riwayat Pemesanan</a>.</p>
    </main>
  );
}
