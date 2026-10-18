import Link from "next/link";
import { db } from "@/lib/prisma";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getDict()).pages.faq.title };
}

export default async function FaqPage() {
  const faqs = await db.faq.findMany({ where: { aktif: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const t = (await getDict()).pages.faq;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">FAQ</p>
      <h1 className="pa-hgrad mt-2 text-3xl font-bold sm:text-4xl">{t.heading}</h1>
      <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">{t.desc}</p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-colors open:border-emerald-300 open:shadow-md dark:border-night-700 dark:bg-night-900 dark:open:border-emerald-700"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-emerald-950 dark:text-emerald-100 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span className="shrink-0 text-xl text-emerald-600 transition-transform duration-200 group-open:rotate-45">
                ＋
              </span>
            </summary>
            <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">{faq.answer}</p>
          </details>
        ))}
        {faqs.length === 0 && (
          <p className="rounded-2xl bg-zinc-50 dark:bg-night-800/50 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            {t.empty}
          </p>
        )}
      </div>

      <div className="mt-10 rounded-2xl bg-emerald-950 px-6 py-8 text-center">
        <p className="text-lg font-bold text-white">{t.ctaTitle}</p>
        <p className="mt-1 text-sm text-emerald-200">{t.ctaSub}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/tentang"
            className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            {t.ctaTentang}
          </Link>
          <Link
            href="/pohon"
            className="inline-flex items-center rounded-xl border border-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-900"
          >
            {t.ctaAdopsi}
          </Link>
        </div>
      </div>
    </main>
  );
}
