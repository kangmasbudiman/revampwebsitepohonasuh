import Link from "next/link";
import { db } from "@/lib/prisma";
import { rupiah, tanggal } from "@/lib/format";
import { deleteExpense } from "@/lib/actions/admin";
import ExpenseForm from "@/components/admin/expense-form";

export const metadata = { title: "Admin — Kelola Keuangan" };

export default async function AdminFinancePage() {
  const expenses = await db.expense.findMany({ orderBy: { spentAt: "desc" } });
  const total = expenses.reduce((sum, e) => sum + e.amountIdr, 0);

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-bold pa-hgrad">Kelola Keuangan</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Catat pengeluaran program. Data ini tampil publik di halaman{" "}
        <a href="/keuangan" className="font-medium text-emerald-700 hover:text-emerald-800">
          Laporan Keuangan
        </a>
        .
      </p>

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">
          + Catat Pengeluaran Baru
        </summary>
        <div className="mt-4">
          <ExpenseForm />
        </div>
      </details>

      <Link
        href="/admin/keuangan/desa"
        className="mt-4 block rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm transition-colors hover:border-emerald-300 dark:border-night-700 dark:hover:border-emerald-800"
      >
        <p className="font-semibold text-emerald-950 dark:text-emerald-50">Laporan Dana per Desa →</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Rincian adopsi, status tagging, dan total dana terverifikasi untuk tiap desa.
        </p>
      </Link>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold pa-hgrad">Riwayat Pengeluaran</h2>
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">Total: {rupiah(total)}</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="pa-thead ">
            <tr>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Uraian</th>
              <th className="px-4 py-3 font-semibold">Kategori</th>
              <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800 pa-card">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">{tanggal(e.spentAt)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{e.title}</p>
                  {e.description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{e.description}</p>}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{e.category || "Lainnya"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                  -{rupiah(e.amountIdr)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteExpense}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 dark:border-red-900 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada pengeluaran tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
