import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans, Nunito, Barlow_Semi_Condensed } from "next/font/google";
import { apiGet } from "@/lib/api";
import CertificateName from "@/components/sertifikat/certificate-name";
import PrintButton from "@/components/sertifikat/print-button";

// Font menyamai PDF template: body Plus Jakarta Sans, pesan Nunito ExtraLight,
// nama & label Barlow SemiCondensed (pengganti Tw Cen MT Condensed).
const certSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cert-sans",
});
const certNunito = Nunito({
  subsets: ["latin"],
  weight: "200",
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
  memo?: string | null;
  jml_pohon?: number | string | null;
  invoice?: string | null;
  idpohon?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  provinsi?: string | null;
  tgl_adopt?: string | null;
  tgl_exp?: string | null;
  pohon_list?: ApiPohonSertifikat[] | null;
};

export const metadata = { title: "Sertifikat Adopsi Pohon" };

const titleCase = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export default async function CertificatePage(props: PageProps<"/sertifikat/[...code]">) {
  const { code } = await props.params;
  const certnum = code.map(decodeURIComponent).join("/");

  let s: ApiSertifikat | null = null;
  try {
    s = await apiGet<ApiSertifikat | null>(`sertifikatpublik/${certnum}`);
  } catch {
    // notFound di bawah yang menangani
  }
  if (!s || !s.certnum) notFound();

  const jml = Number(s.jml_pohon) || 1;
  const lokasi = [
    s.desa ? `${titleCase(s.desa)} Village Forest` : null,
    s.kecamatan ? `${titleCase(s.kecamatan)} Subdistrict` : null,
    s.kabupaten ? `${titleCase(s.kabupaten)} District` : null,
    s.provinsi ? `${titleCase(s.provinsi)} Province` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const memo = (s.memo ?? "").trim();
  const adaMemo = memo !== "" && memo !== "-" && memo.toLowerCase() !== "null";

  const tglAdopt = s.tgl_adopt ? new Date(s.tgl_adopt) : null;
  const jambi = tglAdopt
    ? `Jambi, ${tglAdopt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
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
  const fmtTon = (t: number) => `± ${t.toLocaleString("en-US", { maximumFractionDigits: 1 })} tons`;

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
        barisPohon.push(`Total ${pohonList.length} trees · ${fmtTon(totalTonase)} estimated biomass`);
      }
    } else {
      const dSemua = pohonList.filter((p) => p.diameter > 0).map((p) => p.diameter);
      barisPohon.push(
        [
          `${pohonList.length} trees · ${daftarGrup.length} species`,
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
          Sertifikat terverifikasi · No.{s.certnum}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/pohon" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Adopsi pohon lain →
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
          src="/images/sertifikat/bg.png"
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
              Pohonasuh is interpreted as a public reward given to a community
              <br />
              for its contributions to care trees in the forest.
            </p>
            <p className="mt-[1.05em]">We give appreciation and thanks to:</p>
          </div>

          <div className="absolute top-[38.3%] left-[23.83%] w-[72.5%]">
            <CertificateName
              name={s.nama ?? ""}
              className="font-[family-name:var(--font-cert-title)] text-[5.2cqw] leading-[1.02] font-bold text-[#208745]"
            />
          </div>

          <p className="absolute top-[47.95%] left-[23.75%] w-[72.3%] font-[family-name:var(--font-cert-sans)] text-[1.69cqw] leading-[1.14] text-[#545353]">
            has adopted {jml} {jml === 1 ? "tree" : "trees"} in {lokasi}, INDONESIA. from{" "}
            {s.tgl_adopt ?? "—"} until {s.tgl_exp ?? "—"}.
          </p>

          {adaMemo && (
            <>
              <p className="absolute top-[58.88%] left-[23.75%] font-[family-name:var(--font-cert-title)] text-[2.58cqw] font-medium text-[#208745]">
                Message and Impression:
              </p>
              <p className="absolute top-[63.9%] left-[23.99%] w-[72.4%] font-[family-name:var(--font-cert-nunito)] font-extralight text-[1.21cqw] leading-[1.47] text-[#545353]">
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
                Adopted Trees
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

      <p className="no-print mt-4 text-center text-xs text-zinc-400">
        Sertifikat ini dapat diverifikasi secara daring melalui nomor sertifikat di atas.
      </p>
    </main>
  );
}
