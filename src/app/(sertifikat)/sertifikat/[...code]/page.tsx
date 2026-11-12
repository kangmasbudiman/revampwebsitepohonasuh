import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, Nunito, Barlow_Semi_Condensed } from "next/font/google";
import { apiGet, mapTemplatesertifikatList, type ApiTemplateSertifikat } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { sebutanDesa } from "@/lib/format";
import { skemaSertifikat } from "@/lib/skema";
import CertificateName from "@/components/sertifikat/certificate-name";
import PrintButton from "@/components/sertifikat/print-button";
import CertNameForm from "@/components/cert-name-form";
import SertifikatMemoForm from "@/components/sertifikat-memo-form";
import TemplateShare from "@/components/sertifikat/template-share";

// Font menyamai PDF template: body Plus Jakarta Sans, pesan Nunito ExtraLight,
// nama & label Barlow SemiCondensed (pengganti Tw Cen MT Condensed).
const certSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cert-sans",
});
const certNunito = Nunito({
  subsets: ["latin"],
  weight: ["200", "400"],
  variable: "--font-cert-nunito",
});
const certTitle = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-cert-title",
});

type ApiPohonSertifikat = {
  idpohon?: string | null;
  localname?: string | null;
  species?: string | null;
  diameter?: number | string | null;
  tonase?: number | string | null;
};

type ApiSertifikat = {
  certnum?: string | null;
  nama?: string | null;
  nama_pengasuh?: string | null;
  gfrom?: number | string | null; // adopsi hadiah
  nama_terkunci?: boolean; // nama tagging sudah masuk antrian (proses >= 2)
  memo?: string | null;
  pengasuh?: number | string | null;
  jml_pohon?: number | string | null;
  invoice?: string | null;
  idpohon?: string | null;
  desa?: string | null;
  desa_label?: string | null;
  desa_skema?: string | null; // skema/institusi dari master data lokasi
  kecamatan?: string | null;
  kabupaten?: string | null;
  provinsi?: string | null;
  tgl_adopt?: string | null;
  tgl_exp?: string | null;
  pohon_list?: ApiPohonSertifikat[] | null;
};

export async function generateMetadata() {
  return { title: (await getDict()).sertifikat.title };
}

// Terjemahan istilah skema memakai pemetaan bilingual dinamis di
// src/lib/skema.ts (nilai baku diterjemahkan sesuai bahasa lembar; nilai
// bebas tampil apa adanya).
const titleCase = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export default async function CertificatePage(props: PageProps<"/sertifikat/[...code]">) {
  const { code } = await props.params;
  const sp = await props.searchParams;
  const certnum = code.map(decodeURIComponent).join("/");
  // Teks lembar sertifikat mengikuti ?lang=id|en. Default en agar tautan lama
  // tidak berubah tampilan; pilihan bahasa ikut saat sertifikat dibagikan.
  const t = (await getDict()).sertifikat;
  const lang: "id" | "en" =
    (Array.isArray(sp?.lang) ? sp?.lang[0] : sp?.lang) === "id" ? "id" : "en";
  const L =
    lang === "id"
      ? {
          // Narasi pembuka 2 baris (batas frasa, bukan wrap otomatis) agar
          // tata letak template PDF tetap sama di semua perangkat.
          intro: [
            "Pohonasuh dimaknai sebagai penghargaan publik yang diberikan",
            "kepada masyarakat atas kontribusinya dalam merawat pohon di hutan.",
          ],
          thanks: "Kami memberikan apresiasi dan terima kasih kepada:",
          adopted: (n: number) => `telah mengadopsi ${n} pohon di`,
          from: "dari",
          until: "sampai",
          memoTitle: "Pesan dan Kesan:",
          treesTitle: "Pohon yang Diadopsi",
          totalTrees: (n: number) => `Total ${n} pohon`,
          biomass: "estimasi biomassa",
          speciesLine: (n: number, m: number) => `${n} pohon · ${m} spesies`,
          tons: "ton",
          dateLocale: "id-ID",
        }
      : {
          intro: [
            "Pohonasuh is interpreted as a public reward given to a community",
            "for its contributions to care trees in the forest.",
          ],
          thanks: "We give appreciation and thanks to:",
          adopted: (n: number) => `has adopted ${n} ${n === 1 ? "tree" : "trees"} in`,
          from: "from",
          until: "until",
          memoTitle: "Message and Impression:",
          treesTitle: "Adopted Trees",
          totalTrees: (n: number) => `Total ${n} trees`,
          biomass: "estimated biomass",
          speciesLine: (n: number, m: number) => `${n} trees · ${m} species`,
          tons: "tons",
          dateLocale: "en-US",
        };

  let s: ApiSertifikat | null = null;
  try {
    s = await apiGet<ApiSertifikat | null>(`sertifikatpublik/${certnum}`);
  } catch {
    // notFound di bawah yang menangani
  }
  if (!s || !s.certnum) notFound();

  // Template background: ?tpl=<id> (harus aktif) → template utama → bg.png
  // bawaan. Template dihapus/nonaktif → link lama otomatis fallback.
  let templates: ApiTemplateSertifikat[] = [];
  try {
    templates = mapTemplatesertifikatList(
      await apiGet<Record<string, unknown>[]>("templatelist"),
    ).filter((tpl) => tpl.aktif);
  } catch {
    templates = [];
  }
  const tplParam = Number(Array.isArray(sp?.tpl) ? sp?.tpl[0] : sp?.tpl);
  const terpilih =
    templates.find((tpl) => tpl.id === tplParam) ??
    templates.find((tpl) => tpl.utama) ??
    null;

  const jml = Number(s.jml_pohon) || 1;
  const desaTampil = s.desa_label || s.desa || "";
  // Sumatera Barat: unitnya Nagari — hanya dipakai sebagai fallback bila
  // master data lokasi belum mengisi kolom Skema/Institusi.
  // Skema hutan diambil dari master data lokasi (menu Data Lokasi → kolom
  // "Skema / Institusi"), diterjemahkan sesuai bahasa lembar secara dinamis.
  const nagari = sebutanDesa(s.provinsi) === "Nagari";
  const skema = skemaSertifikat(s.desa_skema, lang, nagari);
  // Baris lokasi dipecah 3 baris di sertifikat: (1) desa + skema hutan,
  // (2) kecamatan/kabupaten/provinsi, (3) periode adopsi.
  const lokasiSkema = desaTampil
    ? lang === "id"
      ? `${skema} ${titleCase(desaTampil)}`
      : `${titleCase(desaTampil)} ${skema}`
    : "";
  const lokasiWilayah = (
    lang === "id"
      ? [
          s.kecamatan ? `Kec. ${titleCase(s.kecamatan)}` : null,
          s.kabupaten ? `Kab. ${titleCase(s.kabupaten)}` : null,
          s.provinsi ? `Prov. ${titleCase(s.provinsi)}` : null,
        ]
      : [
          s.kecamatan ? `${titleCase(s.kecamatan)} Subdistrict` : null,
          s.kabupaten ? `${titleCase(s.kabupaten)} District` : null,
          s.provinsi ? `${titleCase(s.provinsi)} Province` : null,
        ]
  )
    .filter(Boolean)
    .join(", ");
  const memo = (s.memo ?? "").trim();
  const adaMemo = memo !== "" && memo !== "-" && memo.toLowerCase() !== "null";
  const session = await getSession();
  const pemilik = !!session && Number(s.pengasuh) === session.userId;
  // Adopsi hadiah = lembar sertifikat atas nama orang lain. gfrom dipakai
  // order baru; fallback nama penerima ≠ nama donor untuk data lama.
  const namaPenerima = (s.nama ?? "").trim();
  const namaPengasuh = (s.nama_pengasuh ?? "").trim();
  const hadiah =
    Number(s.gfrom) === 1 ||
    (namaPenerima !== "" && namaPengasuh !== "" && namaPenerima !== namaPengasuh);

  const tglAdopt = s.tgl_adopt ? new Date(s.tgl_adopt) : null;
  const jambi = tglAdopt
    ? `Jambi, ${tglAdopt.toLocaleDateString(L.dateLocale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`
    : "Jambi";

  // Blok pohon bawah-kiri (jenis + Ø + tonase per batang). Order besar
  // (satu invoice bisa belasan pohon) → adaptif: ≤5 baris per batang,
  // selebihnya diringkas per spesies; >6 spesies cukup satu baris ringkas.
  const pohonList = (s.pohon_list ?? []).map((p) => ({
    kode: (p.idpohon ?? "").trim(),
    lokal: (p.localname ?? "").trim(),
    spesies: (p.species ?? "").trim(),
    diameter: Number(p.diameter) || 0,
    tonase: p.tonase === null || p.tonase === undefined ? null : Number(p.tonase),
  }));
  const labelPohon = (p: (typeof pohonList)[number]) =>
    p.lokal && p.spesies ? `${p.lokal} (${p.spesies})` : p.lokal || p.spesies || p.kode;
  const fmtTon = (t: number) =>
    `± ${t.toLocaleString(L.dateLocale, { maximumFractionDigits: 1 })} ${L.tons}`;

  const barisPohon: string[] = [];
  let totalTonase = 0;
  for (const p of pohonList) if (p.tonase !== null) totalTonase += p.tonase;

  if (pohonList.length > 0 && pohonList.length <= 5) {
    for (const p of pohonList) {
      const bagian = [
        p.kode && labelPohon(p) !== p.kode ? p.kode : "",
        labelPohon(p),
        p.diameter > 0 ? `Ø ${p.diameter} cm` : "",
        p.tonase !== null ? fmtTon(p.tonase) : "",
      ].filter(Boolean);
      barisPohon.push(bagian.join(" · "));
    }
  } else if (pohonList.length > 5) {
    const grup = new Map<string, { label: string; jumlah: number; dMin: number; dMax: number }>();
    for (const p of pohonList) {
      const kunci = `${p.lokal}|${p.spesies}`;
      const g = grup.get(kunci);
      if (g) {
        g.jumlah += 1;
        g.dMin = Math.min(g.dMin, p.diameter);
        g.dMax = Math.max(g.dMax, p.diameter);
      } else {
        grup.set(kunci, { label: labelPohon(p), jumlah: 1, dMin: p.diameter, dMax: p.diameter });
      }
    }
    const daftarGrup = [...grup.values()];
    if (daftarGrup.length <= 5) {
      for (const g of daftarGrup) {
        const bagian = [
          `${g.jumlah} × ${g.label}`,
          g.dMin > 0 ? (g.dMin === g.dMax ? `Ø ${g.dMin} cm` : `Ø ${g.dMin}–${g.dMax} cm`) : "",
        ].filter(Boolean);
        barisPohon.push(bagian.join(" · "));
      }
      if (totalTonase > 0) {
        barisPohon.push(`${L.totalTrees(pohonList.length)} · ${fmtTon(totalTonase)} ${L.biomass}`);
      }
    } else {
      const dSemua = pohonList.filter((p) => p.diameter > 0).map((p) => p.diameter);
      barisPohon.push(
        [
          `${L.speciesLine(pohonList.length, daftarGrup.length)}`,
          dSemua.length > 0
            ? `Ø ${Math.min(...dSemua)}–${Math.max(...dSemua)} cm`
            : "",
          totalTonase > 0 ? fmtTon(totalTonase) : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
          {t.verified} · {t.no}{s.certnum}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {session && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backDashboard}
            </Link>
          )}
          <Link href="/pohon" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            {t.adoptOther}
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Lembar sertifikat — rasio 828:585.6pt dari PDF template; semua posisi
          & ukuran teks dikalibrasi dari koordinat PDF (persen + cqw). */}
      <div
        className={`pa-sertifikat relative mx-auto aspect-[828/585.6] w-full overflow-hidden rounded-lg bg-[#f5f5e3] shadow-xl [container-type:inline-size] print:w-[296mm] print:rounded-none print:shadow-none ${certSans.variable} ${certNunito.variable} ${certTitle.variable}`}
      >
        <Image
          src={terpilih?.imageUrl ?? "/images/sertifikat/bg.png"}
          alt=""
          fill
          priority
          sizes="1024px"
          className="object-cover"
        />

        <div className="absolute inset-0">
          <p className="absolute top-[2.27%] right-[2.66%] font-[family-name:var(--font-cert-sans)] text-[1.45cqw] text-[#208745]">
            No.{s.certnum}
          </p>

          <div className="absolute top-[27.45%] left-[23.91%] w-[72.2%] font-[family-name:var(--font-cert-sans)] text-[1.69cqw] leading-[1.07] text-[#545353]">
            <p>
              {L.intro.map((baris, i) => (
                <Fragment key={baris}>
                  {i > 0 && <br />}
                  {baris}
                </Fragment>
              ))}
            </p>
            <p className="mt-[1.05em]">{L.thanks}</p>
          </div>

          <div className="absolute top-[38.3%] left-[23.83%] w-[72.5%]">
            <CertificateName
              name={s.nama ?? ""}
              className="font-[family-name:var(--font-cert-title)] text-[5.2cqw] leading-[1.02] font-bold text-[#208745]"
            />
          </div>

          <p className="absolute top-[47.95%] left-[23.75%] w-[72.3%] font-[family-name:var(--font-cert-sans)] text-[1.69cqw] leading-[1.14] text-[#545353]">
            {L.adopted(jml)}
            {lokasiSkema && ` ${lokasiSkema},`}
            <br />
            {lokasiWilayah && `${lokasiWilayah}, `}INDONESIA.
            <br />
            {L.from} {s.tgl_adopt ?? "—"} {L.until} {s.tgl_exp ?? "—"}.
          </p>

          {adaMemo && (
            <>
              <p className="absolute top-[58.5%] left-[23.75%] font-[family-name:var(--font-cert-title)] text-[2.58cqw] font-medium text-[#208745]">
                {L.memoTitle}
              </p>
              {/* Kolom memo disempitkan (ujung kanan ±87,5%) dan dibatasi 2
                  baris — template punya garis dekoratif pada ±68,9% tinggi
                  kertas (diukur dari bg.png); heading & memo dinaikkan sedikit
                  agar baris kedua tetap DI ATAS garis dengan jarak lega. */}
              <p className="absolute top-[63%] left-[23.99%] w-[63.5%] overflow-hidden break-words font-[family-name:var(--font-cert-nunito)] text-[1.5cqw] leading-[1.22] text-[#3f3e3e] line-clamp-2">
                {memo}
              </p>
            </>
          )}

          <p className="absolute top-[72.89%] left-[23.91%] font-[family-name:var(--font-cert-title)] text-[2.58cqw] font-medium text-[#208745]">
            {jambi}
          </p>

          {barisPohon.length > 0 && (
            <div className="absolute top-[78.2%] left-[23.91%] w-[54%] font-[family-name:var(--font-cert-sans)]">
              <p className="text-[1.24cqw] font-semibold tracking-wide text-[#208745] uppercase">
                {L.treesTitle}
              </p>
              <ul className="mt-[0.5cqw] space-y-[0.28cqw] text-[1.12cqw] leading-[1.32] text-[#545353]">
                {barisPohon.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {pemilik && (
        <TemplateShare
          templates={templates}
          certnum={s.certnum ?? ""}
          terpilihId={terpilih?.id ?? null}
          lang={lang}
        />
      )}
      {pemilik && hadiah && (
        <CertNameForm
          certnum={s.certnum ?? ""}
          nama={namaPenerima}
          terkunci={!!s.nama_terkunci}
          variant="card"
        />
      )}
      {pemilik && <SertifikatMemoForm certnum={s.certnum ?? ""} memo={memo} />}

      <p className="no-print mt-4 text-center text-xs text-zinc-400">{t.verifyNote}</p>
    </main>
  );
}
