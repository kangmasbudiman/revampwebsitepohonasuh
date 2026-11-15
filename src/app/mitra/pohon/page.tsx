import { requireUser } from "@/lib/guard";
import { mapTrees, type ApiTree } from "@/lib/api";
import MitraRequestHoldForm from "@/components/mitra/request-hold-form";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Request Hold Pohon | Pohon Asuh" };

export default async function MitraPohonPage(props: PageProps<"/mitra/pohon">) {
  await requireUser();
  const sp = await props.searchParams;

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Request Hold Pohon</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Pilih pohon yang ingin ditahan untuk mitra Anda. Request akan menunggu
        approval admin.
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Terkirim">Request hold terkirim, menunggu approval admin.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <MitraRequestHoldForm trees={trees} />
    </main>
  );
}
