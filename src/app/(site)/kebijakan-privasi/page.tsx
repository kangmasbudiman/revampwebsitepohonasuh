import Link from "next/link";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getDict()).pages.privasi.title };
}

export default async function PrivacyPage() {
  const t = (await getDict()).pages.privasi;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{t.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">{t.updated}</p>

      <div className="mt-8 space-y-8">
        {t.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-emerald-900">{s.title}</h2>
            {s.paras.map((p, i) => (
              <p key={i} className="mt-2 leading-7 text-zinc-600">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm leading-6 text-emerald-900">
        {t.contactBox}{" "}
        <Link href="/kontak" className="font-semibold underline underline-offset-4">
          {t.contactLink}
        </Link>
        .
      </p>
    </main>
  );
}
