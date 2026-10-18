import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { getTentangPublik } from "@/lib/api";

export async function generateMetadata() {
  const t = (await getDict()).pages.tentang;
  return { title: t.title, description: t.metaDesc };
}

// Halaman "Tentang Pohon Asuh" — konten dinamis dari admin panel
// (tentangpublik). Belum diisi / API mati → fallback teks bawaan dict.
export default async function TentangPage() {
  const dict = await getDict();
  const t = dict.pages.tentang;

  let data = null;
  try {
    data = await getTentangPublik();
  } catch {
    // fallback di bawah
  }

  const judul = data?.judul || t.fallbackJudul;
  const deskripsi = data?.deskripsi || t.fallbackDeskripsi;
  const mekanisme = data?.mekanisme || t.fallbackMekanisme;
  const langkah =
    data && data.langkah.length > 0
      ? data.langkah.map((l) => ({ judul: l.judul, isi: l.isi }))
      : t.fallbackLangkah;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <section>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
          {dict.nav.tentang}
        </p>
        <h1 className="pa-hgrad mt-2 text-3xl font-bold sm:text-4xl">{judul}</h1>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-emerald-950">{t.apaItuTitle}</h2>
        <p className="mt-3 whitespace-pre-line leading-7 text-zinc-600">{deskripsi}</p>
      </section>

      <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 dark:border-night-700 dark:bg-night-800/50">
        <h2 className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
          {t.mekanismeTitle}
        </h2>
        <p className="mt-3 whitespace-pre-line leading-7 text-zinc-600 dark:text-zinc-300">
          {mekanisme}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-emerald-950">{t.caraTitle}</h2>
        <ol className="mt-5 space-y-4">
          {langkah.map((l, i) => (
            <li
              key={`${l.judul}-${i}`}
              className="flex gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-100">{l.judul}</p>
                <p className="mt-1 leading-6 text-zinc-600 dark:text-zinc-300">{l.isi}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-2xl bg-emerald-950 px-6 py-8 text-center">
        <p className="text-lg font-bold text-white">{t.cta}</p>
        <p className="mt-1 text-sm text-emerald-200">{t.ctaSub}</p>
        <Link
          href="/pohon"
          className="mt-5 inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
        >
          {t.cta}
        </Link>
      </section>
    </main>
  );
}
