import Link from "next/link";
import { apiGet, mapOrderRows, type ApiOrderRow } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { rupiah } from "@/lib/format";
import SuccessPopup from "@/components/admin/success-popup";
import CancelOrderButton from "@/components/admin/cancel-order-button";

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
  // Dua daftar: sudah upload bukti (menunggu verifikasi) dan belum (menunggu
  // pembayaran donor).
  type OrderGroup = { rows: ApiOrderRow[]; nama: string; invoice: string; tanggal: string };
  const orders = new Map<number, OrderGroup>();
  const unpaid = new Map<number, OrderGroup>();
  for (const r of rows) {
    if (r.confirmation !== "no") continue;
    const target = r.fotoBuktiUrl ? orders : unpaid;
    const o = target.get(r.confirmasiId) ?? {
      rows: [],
      nama: r.nama,
      invoice: r.invoice,
      tanggal: r.createdAt ?? r.tglAdopt ?? "",
    };
    o.rows.push(r);
    target.set(r.confirmasiId, o);
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-bold pa-hgrad">Verifikasi Pembayaran</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Periksa bukti transfer pengadopsi. Pastikan nominal sesuai (harga + kode unik) sebelum
        memverifikasi.
      </p>

      {searchParams.verified === "1" && (
        <SuccessPopup paramKey="verified" title="Diverifikasi">
          ✓ Pembayaran diverifikasi, sertifikat telah terbit.
        </SuccessPopup>
      )}
      {searchParams.rejected === "1" && (
        <SuccessPopup paramKey="rejected" tone="err" title="Ditolak" buttonLabel="Tutup">
          Pembayaran ditolak, pohon dikembalikan menjadi tersedia.
        </SuccessPopup>
      )}
      {searchParams.batal === "1" && (
        <SuccessPopup paramKey="batal" tone="err" title="Order Dibatalkan" buttonLabel="Tutup">
          Order dibatalkan, semua pohon pada invoice dikembalikan menjadi tersedia.
        </SuccessPopup>
      )}
      {searchParams.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(searchParams.error)}
        </SuccessPopup>
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

      <h2 className="mt-10 text-xl font-bold pa-hgrad">Menunggu Pembayaran ({unpaid.size})</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Order sudah dibuat tetapi bukti transfer belum diunggah. Order baru dibatalkan
        otomatis 24 jam setelah dibuat; order lama yang tertinggal (mis. order tahun
        kemarin) dapat dibatalkan manual di sini — pohonnya dikembalikan ke daftar adopsi.
      </p>
      <div className="mt-4 space-y-4">
        {[...unpaid.entries()].map(([id, o]) => {
          const total = o.rows[0]?.total ?? 0;
          return (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-5 shadow-sm dark:border-night-700 dark:bg-night-800/40"
            >
              <div className="min-w-0">
                <p className="font-semibold text-emerald-950 dark:text-emerald-50">{o.nama}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {o.rows.length} pohon · {o.rows.map((r) => r.localName).join(", ")}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                  <span>
                    Invoice {o.invoice}
                    {o.tanggal ? ` · dibuat ${o.tanggal}` : ""}
                  </span>
                  {o.rows[0]?.linkInvoice && (
                    <span
                      title="Donor sudah membuat tautan pembayaran online (Mayar) untuk order ini"
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
                    >
                      ⚡ Tagihan online
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-lg font-bold text-emerald-700">{rupiah(total)}</p>
                <CancelOrderButton
                  confirmasiId={id}
                  invoice={o.invoice}
                  idpohon={o.rows[0].idpohon}
                  localName={o.rows[0].localName}
                  nama={o.nama}
                  redirectTo="/admin/verifikasi"
                  tagihanOnline={Boolean(o.rows[0]?.linkInvoice)}
                />
              </div>
            </div>
          );
        })}
        {unpaid.size === 0 && (
          <p className="rounded-2xl border border-dashed border-amber-200 dark:border-night-700 px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
            Tidak ada order menunggu pembayaran.
          </p>
        )}
      </div>
    </main>
  );
}
