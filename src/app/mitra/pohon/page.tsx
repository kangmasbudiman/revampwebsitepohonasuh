import { requireUser } from "@/lib/guard";
import { apiPost, mapTrees, type ApiTree } from "@/lib/api";
import MitraRequestHoldForm from "@/components/mitra/request-hold-form";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Request Hold Pohon | Pohon Asuh" };

export default async function MitraPohonPage(props: PageProps<"/mitra/pohon">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let aktif = 1;
  try {
    const info = await apiPost<{ value?: number; mitra?: { aktif: number } }>("mitramyinfo", { idmember: session.userId });
    if (Number(info.value) === 200) aktif = Number(info.mitra?.aktif ?? 1);
  } catch {}

  let trees: ApiTree[] = [];
  try {
    const { apiGet } = await import("@/lib/api");
    const res2 = await apiGet<{ data?: Record<string, unknown>[]; total?: number }>(
      "pohonmapall?page=1&per_page=100&status=AVAILABLE",
    );
    trees = mapTrees(res2.data ?? []);
  } catch {
    trees = [];
  }

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Request Hold Pohon</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Pilih pohon yang ingin ditahan untuk mitra Anda. Request akan menunggu
        approval admin.
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Terkirim">Request hold terkirim, menunggu approval admin.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {aktif === 0 ? (
        <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            ⏳ Akun menunggu aktivasi
          </p>
          <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-300/80">
            Pengembalian pemesanan pohon baru tersedia setelah admin mengaktifkan
            akun mitra Anda.
          </p>
        </div>
      ) : (
        <MitraRequestHoldForm trees={trees} />
      )}
    </main>
  );
}
