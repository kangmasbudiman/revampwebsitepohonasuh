import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Coins, MapPin, User } from "lucide-react";
import {
  apiGet,
  mapLaporans,
  LAPORAN_JENIS_LABEL,
  type ApiLaporan,
} from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import LaporanGaleri from "@/components/laporan-galeri";
import { periodeLaporan } from "@/components/laporan-card";

type Props = PageProps<"/laporan/[id]">;

// Hanya laporan ber-status disetujui yang boleh dilihat publik.
async function getLaporan(id: number): Promise<ApiLaporan | null> {
  try {
    const rows = mapLaporans(
      await apiGet<Record<string, unknown>[]>(`laporanlist?id=${id}`),
    );
    const l = rows[0];
    return l && l.status === "disetujui" ? l : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: Props) {
  const { id } = await props.params;
  const [laporan, d] = await Promise.all([getLaporan(Number(id)), getDict()]);
  return {
    title: laporan
      ? d.pages.laporanDetail.title.replaceAll("{title}", laporan.judul)
      : d.pages.laporanDetail.notFoundTitle,
  };
}

export default async function LaporanDetailPage(props: Props) {
  const { id } = await props.params;
  const laporanId = Number(id);
  if (!Number.isInteger(laporanId) || laporanId <= 0) notFound();

  const laporan = await getLaporan(laporanId);
  if (!laporan) notFound();
  const [d, locale] = await Promise.all([getDict(), getLocale()]);
  const dd = d.pages.laporanDetail;

  const meta = [
    laporan.desa.trim() && { icon: MapPin, text: namaDesa(laporan.desa) },
    (laporan.tanggal || laporan.tanggalSelesai) && {
      icon: CalendarDays,
      text: `${dd.periode}: ${periodeLaporan(laporan.tanggal, laporan.tanggalSelesai, locale)}`,
    },
    laporan.petugas && { icon: User, text: `${dd.petugas}: ${laporan.petugas}` },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/laporan"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        {dd.back}
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {dd.verified}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {LAPORAN_JENIS_LABEL[laporan.jenis] ?? laporan.jenis}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold leading-tight text-emerald-950">
          {laporan.judul}
        </h1>

        {meta.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-zinc-600">
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <m.icon className="h-4 w-4 text-emerald-600" aria-hidden />
                {m.text}
              </span>
            ))}
          </div>
        )}

        {laporan.foto.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-bold text-emerald-950">{dd.galeri}</h2>
            <LaporanGaleri judul={laporan.judul} fotos={laporan.foto} />
          </>
        )}

        {laporan.dana !== null && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-4">
            <Coins className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
            <div>
              <p className="text-xs font-medium text-zinc-600">{dd.dana}</p>
              <p className="font-bold text-emerald-800">{rupiah(laporan.dana)}</p>
            </div>
          </div>
        )}

        <div className="mt-8 whitespace-pre-line text-[15px] leading-7 text-zinc-700">
          {laporan.isi}
        </div>

        {laporan.hasil.trim() && (
          <div className="mt-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              {dd.hasilTitle}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">
              {laporan.hasil}
            </p>
          </div>
        )}
      </article>
    </main>
  );
}
