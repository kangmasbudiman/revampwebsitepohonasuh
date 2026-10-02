import Link from "next/link";
import { apiGet, mapDesa, type ApiDesa } from "@/lib/api";

export const metadata = { title: "Lokasi Hutan" };

export default async function LocationListPage() {
  let desaList: ApiDesa[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa"))
      .map(mapDesa)
      .filter((d) => d.aktif);
  } catch {
    // tampilkan daftar kosong di bawah
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">Lokasi Hutan</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Pohon-pohon dalam program Pohon Asuh tersebar di hutan adat dan hutan desa yang dikelola
        bersama masyarakat lokal.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {desaList.map((desa) => {
          const pct = desa.total > 0 ? Math.round((desa.adopted / desa.total) * 100) : 0;
          return (
            <div
              key={desa.slug}
              className="flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/lokasi/${desa.slug}`} className="group">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-emerald-950 group-hover:text-emerald-700">
                    {desa.name}
                  </h2>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {desa.total} pohon
                  </span>
                </div>
              </Link>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {[desa.kecamatan, desa.kabupaten, desa.provinsi].filter(Boolean).join(", ")}
              </p>
              {desa.description && (
                <p className="mt-2 text-sm leading-6 text-zinc-600">{desa.description}</p>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {desa.adopted} diadopsi · {desa.available} tersedia
                  </span>
                  <span className="font-semibold text-emerald-700">{pct}% teradopsi</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <Link
                  href={`/lokasi/${desa.slug}`}
                  className="rounded-full border border-emerald-200 px-4 py-1.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  Detail lokasi
                </Link>
                {desa.available > 0 && (
                  <Link
                    href={`/pohon?lokasi=${desa.slug}`}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    Adopsi di sini
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {desaList.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">
          Gagal memuat data lokasi.{" "}
          <Link href="/lokasi" className="font-medium text-emerald-700 hover:underline">
            Coba lagi
          </Link>
        </p>
      )}
    </main>
  );
}
