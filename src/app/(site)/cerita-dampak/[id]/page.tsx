import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, User } from "lucide-react";
import { apiGet, mapCeritas, type ApiCerita } from "@/lib/api";
import { tanggal } from "@/lib/format";
import { getDict } from "@/lib/i18n";

type Props = PageProps<"/cerita-dampak/[id]">;

async function getCerita(id: number): Promise<ApiCerita | null> {
  try {
    const rows = mapCeritas(await apiGet<Record<string, unknown>[]>("ceritalist"));
    return rows.find((c) => c.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: Props) {
  const { id } = await props.params;
  const [cerita, d] = await Promise.all([getCerita(Number(id)), getDict()]);
  return {
    title: cerita
      ? d.pages.ceritaDetail.title.replaceAll("{title}", cerita.judul)
      : d.pages.ceritaDetail.notFoundTitle,
  };
}

export default async function CeritaDetailPage(props: Props) {
  const { id } = await props.params;
  const ceritaId = Number(id);
  if (!Number.isInteger(ceritaId) || ceritaId <= 0) notFound();

  const cerita = await getCerita(ceritaId);
  if (!cerita) notFound();
  const d = (await getDict()).pages.ceritaDetail;

  let lainnya: ApiCerita[] = [];
  try {
    lainnya = (
      mapCeritas(await apiGet<Record<string, unknown>[]>("ceritalist"))
    ).filter((c) => c.id !== ceritaId);
  } catch {
    // section opsional
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/cerita-dampak" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
        {d.back}
      </Link>

      <article className="mt-4">
        {cerita.fotoUrl && (
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-emerald-50">
            <Image
              src={cerita.fotoUrl}
              alt={cerita.judul}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        <h1 className="mt-6 text-3xl font-bold leading-tight text-emerald-950">
          {cerita.judul}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-800">{cerita.narasumber}</span>
            {cerita.peran && <> · {cerita.peran}</>}
          </span>
          {cerita.lokasi && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" /> {cerita.lokasi}
            </span>
          )}
          {cerita.createdAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              {tanggal(new Date(cerita.createdAt))}
            </span>
          )}
        </div>

        <div className="mt-6 whitespace-pre-line text-[15px] leading-8 text-zinc-700">
          {cerita.isi}
        </div>
      </article>

      {lainnya.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-emerald-950">{d.others}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {lainnya.slice(0, 2).map((c) => (
              <Link
                key={c.id}
                href={`/cerita-dampak/${c.id}`}
                className="group flex gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                  {c.fotoUrl ? (
                    <Image src={c.fotoUrl} alt={c.judul} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl">🌱</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold leading-snug text-emerald-950 group-hover:text-emerald-700">
                    {c.judul}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {c.narasumber}
                    {c.lokasi && <> · {c.lokasi}</>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
