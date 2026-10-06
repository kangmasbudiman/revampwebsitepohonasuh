import Image from "next/image";
import Link from "next/link";
import { Printer } from "lucide-react";
import { requireAdmin } from "@/lib/guard";
import { apiAssetUrl, apiPost, mapOrderRows, type ApiOrderRow } from "@/lib/api";
import { rupiah } from "@/lib/format";
import TaggingForm from "@/components/admin/tagging-form";
import CancelOrderButton from "@/components/admin/cancel-order-button";
import PapanCheck from "@/components/admin/papan-check";
import PapanBatchBar from "@/components/admin/papan-batch-bar";
import { updateOrderNote } from "@/lib/actions/tagging";

export const metadata = { title: "Order Tagging | Pohon Asuh" };

const TABS = [
  { value: "", label: "Semua" },
  { value: "1", label: "Baru" },
  { value: "2", label: "Diproses" },
  { value: "3", label: "Selesai" },
];

const PROSES_BADGE: Record<number, { label: string; className: string }> = {
  1: { label: "Baru", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  2: { label: "Diproses", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  3: { label: "Selesai", className: "bg-emerald-50 text-emerald-700 dark:bg-night-800 dark:text-emerald-300" },
};

type FotoTagging = { idpohon: string; urls: string[] };

export default async function TaggingPage({
  searchParams,
}: PageProps<"/admin/tagging">) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const prosesFilter = ["1", "2", "3"].includes(String(sp.proses)) ? String(sp.proses) : "";

  let orders: ApiOrderRow[] = [];
  let fetchError = false;
  try {
    orders = mapOrderRows(
      await apiPost<Record<string, unknown>[]>("ordercustomerbypengurus", {
        iduser: session.userId,
      }),
    ).sort((a, b) => b.id - a.id);
  } catch {
    fetchError = true;
  }
  // Hanya order terverifikasi yang siap ditandai (paritas mobile).
  const taggable = orders.filter((o) => o.confirmation === "yes");
  const filtered = prosesFilter ? taggable.filter((o) => String(o.proses) === prosesFilter) : taggable;

  // Foto tagging per pohon untuk order yang tampil (volume per petugas kecil).
  const fotos: Record<string, string[]> = {};
  await Promise.all(
    filtered.map(async (o) => {
      if (fotos[o.idpohon]) return;
      try {
        const rows = await apiPost<{ urlGambar?: string }[]>("lihatfototaging", {
          idpohon: o.idpohon,
        });
        fotos[o.idpohon] = rows
          .map((r) => apiAssetUrl(r.urlGambar))
          .filter((u): u is string => !!u);
      } catch {
        fotos[o.idpohon] = [];
      }
    }),
  );

  // Catatan internal per order (getnoted; '-' berarti belum ada).
  const notes: Record<number, string> = {};
  await Promise.all(
    filtered.map(async (o) => {
      try {
        const res = await apiPost<{ message?: string }>("getnoted", { idorder: o.id });
        const n = String(res.message ?? "").trim();
        notes[o.id] = n && n !== "-" ? n : "";
      } catch {
        notes[o.id] = "";
      }
    }),
  );

  const countFor = (v: string) =>
    v ? taggable.filter((o) => String(o.proses) === v).length : taggable.length;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Order Tagging</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Pohon terverifikasi yang menunggu ditandai di lapangan. Unggah foto tagging lalu tandai
        selesai — sertifikat donatur terbit otomatis setelah selesai (paritas aplikasi mobile).
        Conteng kartu <span className="font-semibold text-emerald-700 dark:text-emerald-300">Papan</span> untuk
        mengunduh beberapa papan taging sekaligus dalam satu file ZIP.
      </p>

      {sp?.proses && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Order ditandai sedang diproses.
        </p>
      )}
      {sp?.selesai && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Order selesai — pohon kini berstatus teradopsi.
        </p>
      )}
      {sp?.catatan && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Catatan order tersimpan.
        </p>
      )}
      {sp?.batal && (
        <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-night-800 px-4 py-3 text-sm text-emerald-700">
          Order dibatalkan — pohon pada invoice dikembalikan ke tersedia dan donatur dinotifikasi.
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">{String(sp.error)}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/admin/tagging?proses=${tab.value}` : "/admin/tagging"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              prosesFilter === tab.value
                ? "pa-btn-primary text-white shadow-sm"
                : "border border-emerald-200 dark:border-night-700 pa-card text-emerald-800 hover:bg-emerald-50 dark:hover:bg-night-800"
            }`}
          >
            {tab.label} ({countFor(tab.value)})
          </Link>
        ))}
      </div>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat order. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {filtered.map((order) => {
          const badge = PROSES_BADGE[order.proses] ?? {
            label: `Proses ${order.proses}`,
            className: "bg-zinc-100 text-zinc-600 dark:text-zinc-300",
          };
          const osm =
            order.lat && order.lng
              ? `https://www.openstreetmap.org/?mlat=${order.lat}&mlon=${order.lng}#map=17/${order.lat}/${order.lng}`
              : null;
          return (
            <div
              key={order.id}
              className="rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {order.photoUrl && (
                    <Image
                      src={order.photoUrl}
                      alt={order.localName}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-emerald-950 dark:text-emerald-50">
                      {order.localName}{" "}
                      <span className="font-mono text-xs font-semibold text-emerald-700">
                        {order.idpohon}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {order.nama} · {order.invoice} · <span className="capitalize">{order.desa}</span>
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold text-emerald-800">{rupiah(order.price)}</span>
                {order.tglAdopt && <span>Adopsi: {order.tglAdopt}</span>}
                {osm && (
                  <a
                    href={osm}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    Lihat lokasi pohon di peta ↗
                  </a>
                )}
                <PapanCheck order={order} />
                <Link
                  href={`/admin/tagging/${order.id}/papan`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                >
                  <Printer className="h-3.5 w-3.5" /> Papan Taging
                </Link>
                {order.proses !== 3 && (
                  <CancelOrderButton
                    confirmasiId={order.confirmasiId}
                    invoice={order.invoice}
                    idpohon={order.idpohon}
                    localName={order.localName}
                    nama={order.nama}
                  />
                )}
              </div>

              {fotos[order.idpohon]?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    Foto tagging ({fotos[order.idpohon].length})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fotos[order.idpohon].map((u, i) => (
                      <Image
                        key={`${u}-${i}`}
                        src={u}
                        alt={`Foto tagging ${i + 1}`}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg border border-emerald-100 dark:border-night-700 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              <form
                action={updateOrderNote}
                className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-emerald-50/60 px-3 py-2.5 dark:bg-night-800/50"
              >
                <input type="hidden" name="id" value={order.id} />
                <label className="min-w-0 flex-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Catatan order
                  <input
                    name="note"
                    defaultValue={notes[order.id] ?? ""}
                    maxLength={200}
                    placeholder="Catatan internal untuk order ini (mis. kondisi pohon, jadwal kunjungan)…"
                    className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-normal text-zinc-800 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-night-700 dark:bg-night-900 dark:text-emerald-300 dark:hover:bg-night-800"
                >
                  Simpan Catatan
                </button>
              </form>

              <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
                <TaggingForm id={order.id} idpohon={order.idpohon} proses={order.proses} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && !fetchError && (
          <p className="rounded-2xl border border-dashed border-emerald-200 dark:border-night-700 bg-emerald-50 dark:bg-night-800/40 px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Tidak ada order pada filter ini.
          </p>
        )}
      </div>

      {filtered.length > 0 && <PapanBatchBar />}
    </main>
  );
}
