import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { Paperclip, SearchX, ArrowRight } from "lucide-react";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Bukti Transfer Mitra | Pohon Asuh" };

type PendingInvoice = {
  confirmasi_id: number;
  invoice: string;
  mitra: string;
  tgl: string | null;
  jumlah: number;
  adopsi: unknown[];
  bukti?: string;
  price?: number;
};

export default async function BuktiTransferMitraPage(props: PageProps<"/admin/bukti-transfer-mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";

  let data: PendingInvoice[] = [];
  let fetchError: string | null = null;
  try {
    const base = process.env.API_BASE_URL;
    const key = process.env.ADMIN_API_KEY ?? "";
    const url = `${base}/adosimitrapending?bukti=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "X-Admin-Key": key }, cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      data = (json.data ?? []) as PendingInvoice[];
    } else {
      fetchError = json?.pesan ?? `Gagal memuat (HTTP ${res.status})`;
    }
  } catch {
    fetchError = "Gagal menghubungi server API.";
  }

  return (
    <main className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <h1 className="flex items-center gap-3 text-2xl font-bold pa-hgrad">
        <Paperclip className="h-7 w-7 text-emerald-600" aria-hidden />
        Bukti Transfer Mitra
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Bukti pembayaran yang diunggah mitra untuk pembayaran manual (transfer bank). Klik gambar untuk
        membuka dalam ukuran penuh, lalu langsung verifikasi dari halaman Verifikasi Adopsi Mitra.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari mitra / invoice…"
          className="w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        />
        <button type="submit" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
          Cari
        </button>
        {q && <Link href="/admin/bukti-transfer-mitra" className="text-xs text-zinc-500 underline">Reset</Link>}
      </form>

      {fetchError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{fetchError}</p>
      ) : data.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-14 text-center">
          <SearchX className="h-10 w-10 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">
            {q ? `Tidak ada hasil untuk “${q}”` : "Belum ada bukti transfer masuk"}
          </p>
          <p className="max-w-md text-xs text-zinc-500">
            Mitra mengunggah bukti dari menu tagihan / halaman pembayaran. Bukti muncul di sini selama invoice belum diverifikasi.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((inv) => (
            <article
              key={inv.confirmasi_id}
              className="flex flex-col overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700"
            >
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 dark:border-night-700 dark:bg-emerald-950/20">
                <div>
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{inv.mitra}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Invoice <span className="font-mono">{inv.invoice}</span> · {inv.tgl ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{rupiah(inv.price ?? 0)}</p>
                  <p className="text-[11px] text-zinc-500">{inv.jumlah} pohon</p>
                </div>
              </header>
              {inv.bukti ? (
                <a
                  href={inv.bukti}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-zinc-100 dark:bg-night-800"
                  title="Buka bukti transfer ukuran penuh"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inv.bukti}
                    alt={`Bukti transfer ${inv.invoice}`}
                    className="h-56 w-full object-contain sm:h-64"
                  />
                </a>
              ) : (
                <div className="flex h-56 items-center justify-center text-xs text-zinc-400">—</div>
              )}
              <footer className="mt-auto flex items-center justify-between gap-2 p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Transfer Manual</span>
                <Link
                  href="/admin/verifikasi-adopsi-mitra"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  Periksa &amp; Verifikasi
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </footer>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
