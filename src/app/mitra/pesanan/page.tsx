import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapDesa, mapProgramMitra, mapTrees, type ApiDesa, type ApiProgramMitra } from "@/lib/api";
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
  let trees: ReturnType<typeof mapTrees> = [];

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

  try {
    const desaFilter = typeof sp?.desa === "string" ? sp.desa.trim() : "";
    const qs = desaFilter
      ? `pohonmapall?page=1&per_page=150&status=AVAILABLE&desa=${encodeURIComponent(desaFilter)}`
      : "pohonmapall?page=1&per_page=200&status=AVAILABLE";
    const res = await apiGet<{ data?: Record<string, unknown>[] }>(qs);
    trees = mapTrees(res.data ?? []);
  } catch {
    trees = [];
  }


  if (!mitraId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }


  const pickerTrees = trees.map((t) => ({
    id: t.id,
    code: t.code,
    localName: t.localName,
    species: t.species,
    desa: t.desa,
    priceIdr: t.priceIdr,
    photoUrl: t.photoUrl,
    diameterCm: t.diameterCm,
    heightM: t.heightM,
    co2Kg: null,
  }));

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Pemesanan Pohon</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Mitra: <strong>{mitraName}</strong>. Pilih lokasi &amp; pohon tersedia, kirim permintaan — menunggu pemeriksaan &amp; persetujuan admin KKI Warsi. Pohon yang disetujui tidak bisa diadopsi publik.
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Pesanan Terkirim">Permintaan pemesanan terkirim. Admin akan memeriksa & menyetujui.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {aktif === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-center text-sm text-amber-800">
          Akun Anda menunggu aktivasi admin — belum bisa mengajukan pesanan.
        </div>
      ) : (
        <MitraPohonOrderForm trees={pickerTrees} desas={desas} programs={programs.map((p) => ({ id: p.id, nama: p.nama }))} desaActive={typeof sp?.desa === "string" ? sp.desa.trim() : ""} />
      )}

      <p className="mt-6 text-center text-xs text-zinc-400">Pantau semua permintaan pohon Anda di menu <a href="/mitra/riwayat-pesanan" className="font-semibold text-emerald-700 hover:underline">Riwayat Pemesanan</a>.</p>
    </main>
  );
}
