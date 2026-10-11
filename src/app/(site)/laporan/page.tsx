import Link from "next/link";
import {
  apiGet,
  mapLaporans,
  type ApiLaporan,
} from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n";
import LaporanCard from "@/components/laporan-card";

export async function generateMetadata() {
  return { title: (await getDict()).pages.laporan.title };
}

export default async function LaporanPage() {
  const [d, locale] = await Promise.all([getDict(), getLocale()]);

  let items: ApiLaporan[] = [];
  let error = false;
  try {
    items = mapLaporans(
      await apiGet<Record<string, unknown>[]>("laporanlist?status=disetujui"),
    );
  } catch {
    error = true;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.pages.laporan.heading}</h1>
      <p className="mt-2 max-w-3xl text-zinc-600">{d.pages.laporan.intro}</p>

      {error ? (
        <p className="mt-10 text-center text-zinc-500">
          {d.pages.laporan.loadError}{" "}
          <Link
            href="/laporan"
            className="font-medium text-emerald-700 hover:underline"
          >
            {d.pages.laporan.retry}
          </Link>
        </p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-zinc-500">{d.pages.laporan.empty}</p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((l) => (
            <LaporanCard
              key={l.id}
              laporan={l}
              locale={locale}
              verifiedLabel={d.pages.laporan.verified}
            />
          ))}
        </div>
      )}
    </main>
  );
}
