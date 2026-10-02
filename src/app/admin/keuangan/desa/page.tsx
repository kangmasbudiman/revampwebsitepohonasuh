import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { apiGet, apiPost, mapDesa, type ApiDesa } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Laporan Dana per Desa | Pohon Asuh" };

type Row = {
  id: number;
  invoice: string;
  idpohon: string;
  localName: string;
  nama: string;
  price: number;
  proses: number;
  tglAdopt: string | null;
  tglExp: string | null;
  confirmasi: string;
  confirmasiBy: string;
  fotoBukti: string | null;
};

const PROSES_LABEL: Record<number, { label: string; className: string }> = {
  0: { label: "Selesai", className: "bg-zinc-100 text-zinc-700 dark:bg-night-700 dark:text-zinc-300" },
  1: { label: "Menunggu verifikasi", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" },
  2: { label: "Menunggu tagging", className: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300" },
  3: { label: "Terverifikasi", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
};

function mapRow(r: Record<string, unknown>): Row {
  return {
    id: Number(r.id),
    invoice: String(r.invoice ?? ""),
    idpohon: String(r.idpohon ?? ""),
    localName: String(r.localname ?? "-"),
    nama: String(r.nama ?? ""),
    price: Number(r.price ?? 0),
    proses: Number(r.proses ?? 0),
    tglAdopt: r.tgl_adopt ? String(r.tgl_adopt) : null,
    tglExp: r.tgl_exp ? String(r.tgl_exp) : null,
    confirmasi: String(r.confirmasi ?? ""),
    confirmasiBy: String(r.confirmasiBy ?? ""),
    fotoBukti: r.fotopembayaran ? String(r.fotopembayaran) : null,
  };
}

export default async function LaporanDesaPage({
  searchParams,
}: PageProps<"/admin/keuangan/desa">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let desaList: ApiDesa[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    // daftar kosong → ditangani di render
  }

  const dId = Number((Array.isArray(sp?.d) ? sp.d[0] : sp?.d) ?? NaN);
  const desa = Number.isFinite(dId) ? desaList.find((x) => x.id === dId) : undefined;

  if (!desa) {
    return (
      <main className="w-full px-6 py-8 lg:px-10">
        <Link
          href="/admin/keuangan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Keuangan
        </Link>
        <h1 className="mt-4 text-2xl font-bold pa-hgrad">
          Laporan Dana per Desa
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pilih desa untuk melihat rincian adopsi dan dana yang masuk dari desa tersebut.
        </p>

        {desaList.length === 0 ? (
          <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            Gagal memuat daftar desa. Muat ulang halaman untuk mencoba lagi.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {desaList.map((d) => (
              <Link
                key={d.id}
                href={`/admin/keuangan/desa?d=${d.id}`}
                className="group rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm transition-colors hover:border-emerald-300 dark:border-night-700 dark:hover:border-emerald-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-emerald-950 group-hover:text-emerald-700 dark:text-emerald-50">
                      {d.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <MapPin className="h-3 w-3" /> {d.provinsi ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {d.adopted} teradopsi
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Lihat laporan →
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    );
  }

  let rows: Row[] = [];
  let dana = 0;
  let fetchError = false;
  try {
    rows = (await apiPost<Record<string, unknown>[]>("reportdesa", { id: desa.id })).map(mapRow);
  } catch {
    fetchError = true;
  }
  try {
    const res = await apiPost<{ jumlah?: string | number }>("feedesa", { id: desa.id });
    dana = Number(res.jumlah ?? 0) || 0;
  } catch {
    // dana 0 — biarkan feedesa gagal diam-diam
  }

  const subtotal = rows.reduce((s, r) => s + r.price, 0);

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href="/admin/keuangan/desa"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar desa
      </Link>

      <h1 className="mt-4 text-2xl font-bold pa-hgrad">
        Laporan Desa {desa.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {desa.kecamatan ?? "—"}, {desa.kabupaten ?? "—"}, {desa.provinsi ?? "—"}
      </p>

      {fetchError && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat rincian order. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Dana terverifikasi
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{rupiah(dana)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Adopsi selesai tagging (proses selesai)
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Nilai adopsi berjalan
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-50">{rupiah(subtotal)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {rows.length.toLocaleString("id-ID")} pohon dalam proses/terverifikasi
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm dark:border-night-700">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Verifikasi pembayaran
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-50">
            {rows.filter((r) => r.confirmasi === "yes").length} / {rows.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Order sudah diverifikasi admin</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Pohon</th>
                <th className="px-4 py-3">Donatur</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pembayaran</th>
                <th className="px-4 py-3">Adopsi</th>
                <th className="px-4 py-3 text-right">Nilai</th>
                <th className="px-4 py-3 text-right">Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {rows.map((r) => {
                const st = PROSES_LABEL[r.proses] ?? PROSES_LABEL[0];
                return (
                  <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {r.invoice}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {r.idpohon}
                      </span>{" "}
                      <span className="text-zinc-600 dark:text-zinc-300">{r.localName}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{r.nama || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.confirmasi === "yes" ? (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Terverifikasi{r.confirmasiBy ? ` — ${r.confirmasiBy}` : ""}
                        </span>
                      ) : r.confirmasi === "cancel" ? (
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">Dibatalkan</span>
                      ) : (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Menunggu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                      {r.tglAdopt ?? "—"}
                      {r.tglExp ? <span className="block text-zinc-400">s.d. {r.tglExp}</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-100">
                      {rupiah(r.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.fotoBukti ? (
                        <a
                          href={r.fotoBukti}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                        >
                          Lihat
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !fetchError && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    Belum ada adopsi aktif untuk desa ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
