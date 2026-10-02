import { db } from "@/lib/prisma";
import { apiGet } from "@/lib/api";
import { rupiah, tanggal } from "@/lib/format";

export const metadata = { title: "Laporan Keuangan" };

export default async function FinancePage() {
  let income = 0;
  try {
    const res = await apiGet<{ total?: number }>("totaldonasi");
    income = Number(res.total) || 0;
  } catch {
    // biarkan 0, halaman tetap tampil
  }

  const expenses = await db.expense.findMany({ orderBy: { spentAt: "desc" } });
  const spent = expenses.reduce((sum, e) => sum + e.amountIdr, 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.trim() || "Lainnya";
    byCategory.set(key, (byCategory.get(key) ?? 0) + e.amountIdr);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">Laporan Keuangan</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Transparansi penggunaan dana adopsi. Semua pemasukan dari adopsi terverifikasi dan
        pengeluaran program dipublikasikan di bawah ini.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-sm text-emerald-800/70">Total Pemasukan Adopsi</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{rupiah(income)}</p>
          <p className="mt-1 text-xs text-emerald-800/60">dari donasi terverifikasi</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
          <p className="text-sm text-red-800/70">Total Pengeluaran</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{rupiah(spent)}</p>
          <p className="mt-1 text-xs text-red-800/60">{expenses.length} transaksi</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Saldo Program</p>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{rupiah(income - spent)}</p>
          <p className="mt-1 text-xs text-zinc-400">dikelola oleh Yayasan KKI Warsi</p>
        </div>
      </div>

      {byCategory.size > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-emerald-950">Pengeluaran per Kategori</h2>
          <div className="mt-4 space-y-3">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 truncate text-sm font-medium text-zinc-700">
                    {category}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-emerald-50">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${spent > 0 ? Math.round((amount / spent) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-32 shrink-0 text-right text-sm font-semibold text-emerald-800">
                    {rupiah(amount)}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold text-emerald-950">Rincian Pengeluaran</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-emerald-50 text-emerald-900">
              <tr>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Uraian</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 bg-white">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{tanggal(e.spentAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{e.title}</p>
                    {e.description && <p className="text-xs text-zinc-500">{e.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {e.category || "Lainnya"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-600">
                    -{rupiah(e.amountIdr)}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Belum ada data pengeluaran yang dipublikasikan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
