import { db } from "@/lib/prisma";
import { deleteFaq, toggleFaq } from "@/lib/actions/faq";
import FaqForm from "@/components/admin/faq-form";

export const metadata = { title: "Kelola FAQ | Admin Pohon Asuh" };

export default async function AdminFaqPage() {
  const faqs = await db.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const nextOrder = faqs.length ? Math.max(...faqs.map((f) => f.sortOrder)) + 1 : 1;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Kelola FAQ</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Pertanyaan yang sering diajukan — tampil publik di halaman /faq (urutan terkecil duluan).
      </p>

      <details className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800 dark:text-emerald-300">
          + Tambah FAQ Baru
        </summary>
        <div className="mt-4">
          <FaqForm defaultOrder={nextOrder} />
        </div>
      </details>

      <div className="mt-8 max-w-3xl space-y-3">
        {faqs.map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {f.sortOrder}
              </span>
              <p className="min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-100">
                {f.question}
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  f.aktif
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-night-800 dark:text-zinc-400"
                }`}
              >
                {f.aktif ? "Aktif" : "Nonaktif"}
              </span>
              <form action={toggleFaq}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-200 dark:border-night-700 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                >
                  {f.aktif ? "Sembunyikan" : "Tampilkan"}
                </button>
              </form>
              <form action={deleteFaq}>
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 dark:border-red-900 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50"
                >
                  Hapus
                </button>
              </form>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">
                Edit
              </summary>
              <div className="mt-3 rounded-xl bg-white/70 p-4 dark:bg-night-900/60">
                <FaqForm
                  faq={{
                    id: f.id,
                    question: f.question,
                    answer: f.answer,
                    sortOrder: f.sortOrder,
                    aktif: f.aktif,
                  }}
                />
              </div>
            </details>
          </div>
        ))}
        {faqs.length === 0 && (
          <p className="rounded-xl bg-zinc-50 dark:bg-night-800/50 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
            Belum ada FAQ — klik &ldquo;Tambah FAQ Baru&rdquo; untuk mengisi.
          </p>
        )}
      </div>
    </main>
  );
}
