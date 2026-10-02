import Link from "next/link";
import { apiGet, mapOrderRows, type ApiOrderRow } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Admin — Verifikasi Pembayaran" };

export default async function VerificationListPage(props: PageProps<"/admin/verifikasi">) {
  await requireAdminLevel();
  const searchParams = await props.searchParams;

  let rows: ApiOrderRow[] = [];
  try {
    rows = mapOrderRows(await apiGet<Record<string, unknown>[]>("ordercustomer"));
  } catch {
    // tampilkan daftar kosong di bawah
  }

  // Satu order (confirmation) bisa berisi beberapa pohon — grup per confirmasiId.
  const orders = new Map<number, { rows: ApiOrderRow[]; nama: string; invoice: string; tanggal: string }>();
  for (const r of rows) {
    if (r.confirmation !== "no" || !r.fotoBuktiUrl) continue;
    const o = orders.get(r.confirmasiId) ?? {
      rows: [],
      nama: r.nama,
      invoice: r.invoice,
      tanggal: r.createdAt ?? r.tglAdopt ?? "",
    };
    o.rows.push(r);
    orders.set(r.confirmasiId, o);
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-bold pa-hgrad">Verifikasi Pembayaran</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Periksa bukti transfer donatur. Pastikan nominal sesuai (harga + kode unik) sebelum
        memverifikasi.
      </p>

      {searchParams.verified === "1" && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm font-medium text-emerald-800">
          ✓ Pembayaran diverifikasi, sertifikat telah terbit.
        </p>
      )}
      {searchParams.rejected === "1" && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700">
          Pembayaran ditolak, pohon dikembalikan menjadi tersedia.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {[...orders.entries()].map(([id, o]) => {
          const subtotal = o.rows.reduce((sum, r) => sum + r.price, 0);
          const total = o.rows[0]?.total ?? 0;
          return (
            <Link
              key={id}
              href={`/admin/verifikasi/${id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-50">{o.nama}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {o.rows.length} pohon · {o.rows.map((r) => r.localName).join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Invoice {o.invoice}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-700">{rupiah(total)}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">kode unik {Math.max(0, total - subtotal)}</p>
              </div>
            </Link>
          );
        })}
        {orders.size === 0 && (
          <p className="rounded-2xl border border-dashed border-emerald-200 dark:border-night-700 bg-emerald-50 dark:bg-night-800/40 px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
            Tidak ada pembayaran menunggu verifikasi. 🎉
          </p>
        )}
      </div>
    </main>
  );
}
