import Link from "next/link";
import { ArrowRight, CheckCircle2, TreePine, Wallet } from "lucide-react";
import type { ApiLaporan } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import LaporanCard from "@/components/laporan-card";
import Reveal from "@/components/reveal";

// Section publik "Laporan Kegiatan" di beranda: hanya laporan yang sudah
// disetujui admin; statistik dihitung dari daftar laporan tersebut.
export default async function LaporanSection({ items }: { items: ApiLaporan[] }) {
  if (items.length === 0) return null;
  const [d, locale] = await Promise.all([getDict(), getLocale()]);

  const totalDana = items.reduce((sum, l) => sum + (l.dana ?? 0), 0);
  const jumlahDesa = new Set(
    items.map((l) => l.desa.trim()).filter(Boolean),
  ).size;
  const stats = [
    {
      icon: Wallet,
      title: d.home.laporanStatDanaTitle,
      value: rupiah(totalDana),
      sub: d.home.laporanStatDanaSub,
    },
    {
      icon: CheckCircle2,
      title: d.home.laporanStatCountTitle,
      value: String(items.length),
      sub: d.home.laporanStatCountSub,
    },
    {
      icon: TreePine,
      title: d.home.laporanStatDesaTitle,
      value: String(jumlahDesa),
      sub: d.home.laporanStatDesaSub,
    },
  ];

  return (
    <section className="bg-emerald-50/60 py-20" aria-labelledby="laporan-beranda">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
            {d.home.laporanEyebrow}
          </p>
          <h2
            id="laporan-beranda"
            className="mt-3 text-center text-3xl font-bold text-emerald-950"
          >
            {d.home.laporanTitle}
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600" />
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-zinc-600">
            {d.home.laporanSubtitle}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal key={s.title} delay={i * 120}>
              <div className="flex h-full items-start gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-700">{s.title}</p>
                  <p className="mt-0.5 whitespace-nowrap text-xl font-bold text-emerald-700">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{s.sub}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-emerald-950">
              {d.home.laporanLatest}
            </h3>
            <Link
              href="/laporan"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
            >
              {d.home.laporanViewAll}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {items.slice(0, 2).map((l, i) => (
            <Reveal key={l.id} delay={i * 120}>
              <LaporanCard
                laporan={l}
                locale={locale}
                verifiedLabel={d.home.laporanVerified}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
