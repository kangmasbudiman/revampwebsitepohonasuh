import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import {
  apiGet,
  apiPost,
  mapDesa,
  mapPenugasan,
  mapPetaPohons,
  type ApiPetaPohon,
} from "@/lib/api";
import PetaDesaMapLoader from "@/components/admin/peta-desa-map-loader";
import PetaDownloadPanel from "@/components/admin/peta-download-panel";

export const metadata = { title: "Kelola Peta Desa | Pohon Asuh" };

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  total: { label: "Total", className: "pa-btn-primary text-white" },
  AVAILABLE: { label: "Tersedia", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
  RESERVED: { label: "Dipesan", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
  ADOPTED: { label: "Teradopsi", className: "bg-zinc-100 text-zinc-600 dark:bg-night-700 dark:text-zinc-300" },
};

export default async function PetaDesaPage({
  searchParams,
}: PageProps<"/admin/peta">) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const level = session.level ?? 1;

  // Daftar desa: admin melihat semua; petugas hanya desa tugasnya.
  let daftarDesa: string[] = [];
  try {
    if (level === 2) {
      const penugasan = mapPenugasan(await apiGet<Record<string, unknown>>("penugasandesa"));
      daftarDesa = (penugasan.petugas.find((p) => p.id === session.userId)?.desaList ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      daftarDesa = (
        await apiGet<Record<string, unknown>[]>("getdesa")
      )
        .map(mapDesa)
        .map((d) => d.name)
        .filter(Boolean);
    }
  } catch {
    daftarDesa = [];
  }

  const aktif = String(sp.desa ?? "");
  const desa = daftarDesa.includes(aktif) ? aktif : daftarDesa[0];
  if (daftarDesa.length > 0 && aktif !== desa) {
    redirect(`/admin/peta?desa=${encodeURIComponent(desa)}`);
  }

  let pohon: ApiPetaPohon[] = [];
  let fetchError = false;
  if (desa) {
    try {
      pohon = mapPetaPohons(await apiPost<Record<string, unknown>[]>("pohonmapdesa", { desa }));
    } catch {
      fetchError = true;
    }
  }

  const jumlah = {
    total: pohon.length,
    AVAILABLE: pohon.filter((p) => p.status === "AVAILABLE").length,
    RESERVED: pohon.filter((p) => p.status === "RESERVED").length,
    ADOPTED: pohon.filter((p) => p.status === "ADOPTED").length,
  };

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Kelola Peta Desa</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Peta sebaran pohon per desa beserta unduhan peta offline (PDF/KML/GeoJSON) untuk petugas
        melakukan tagging di lapangan tanpa internet.
      </p>

      {daftarDesa.length === 0 && (
        <p className="mt-8 rounded-xl bg-amber-50 dark:border dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {level === 2
            ? "Anda belum ditugaskan di desa mana pun. Hubungi admin."
            : "Daftar desa tidak dapat dimuat. Muat ulang halaman."}
        </p>
      )}

      {daftarDesa.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {daftarDesa.map((d) => (
              <Link
                key={d}
                href={`/admin/peta?desa=${encodeURIComponent(d)}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  d === desa
                    ? "pa-btn-primary text-white shadow-sm"
                    : "border border-emerald-200 dark:border-night-700 pa-card text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-night-800"
                }`}
              >
                {d}
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["total", "AVAILABLE", "RESERVED", "ADOPTED"] as const).map((k) => (
              <span
                key={k}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_CHIP[k].className}`}
              >
                {STATUS_CHIP[k].label}: {jumlah[k]}
              </span>
            ))}
          </div>

          {fetchError && (
            <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              Gagal memuat data pohon desa {desa}. Muat ulang halaman.
            </p>
          )}

          <div className="mt-6">
            {pohon.some((p) => p.lat !== null && p.lng !== null) ? (
              <PetaDesaMapLoader desa={desa} pohon={pohon} />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-emerald-200 dark:border-night-700 bg-emerald-50 dark:bg-night-800/40 text-sm text-zinc-500 dark:text-zinc-400">
                Tidak ada pohon berkoordinat untuk desa ini.
              </div>
            )}
          </div>

          <div className="mt-6">
            <PetaDownloadPanel desa={desa} pohon={pohon} />
          </div>
        </>
      )}
    </main>
  );
}
