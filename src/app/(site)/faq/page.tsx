import { db } from "@/lib/prisma";
import { getDict } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: (await getDict()).pages.faq.title };
}

export default async function FaqPage() {
  const faqs = await db.faq.findMany({ orderBy: { sortOrder: "asc" } });
  const t = (await getDict()).pages.faq;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{t.heading}</h1>
      <p className="mt-2 text-zinc-600">{t.desc}</p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-xl border border-emerald-100 bg-white p-4 shadow-sm open:border-emerald-300"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span className="shrink-0 text-emerald-600 transition-transform group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 leading-7 text-zinc-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
