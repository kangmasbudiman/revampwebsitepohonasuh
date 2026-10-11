import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapLaporans, mapLokasi, LAPORAN_JENIS_LABEL } from "@/lib/api";
import LaporanForm from "@/components/admin/laporan-form";
import LaporanGaleriForm from "@/components/admin/laporan-galeri-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteLaporan, deleteLaporanFoto } from "@/lib/actions/laporan";

export const metadata = { title: "Edit Laporan Kegiatan | Pohon Asuh" };

export default async function EditLaporanPage(
  props: PageProps<"/admin/laporan/[id]/edit">,
) {
  const session = await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const idLaporan = Number(id);
  if (!idLaporan) notFound();

  let laporan;
  try {
    laporan = mapLaporans(await apiGet<Record<string, unknown>[]>(`laporanlist?id=${idLaporan}`))[0];
  } catch {
    notFound();
  }
  if (!laporan) notFound();
  // Petugas hanya boleh membuka laporan miliknya sendiri.
  if ((session.level ?? 1) !== 1 && laporan.idpetugas !== session.userId) notFound();

  let desaList: { nama: string; label: string }[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa"))
      .map(mapLokasi)
      .map((d) => ({ nama: d.nama, label: d.label || d.nama }));
  } catch {
    desaList = [];
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link
        href="/admin/laporan"
        className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
      >
        ← Daftar Laporan Kegiatan
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">{laporan.judul}</h1>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>{laporan.tanggal}</span>
        <span>·</span>
        <span>{LAPORAN_JENIS_LABEL[laporan.jenis] ?? "Lainnya"}</span>
        {laporan.desa && (
          <>
            <span>·</span>
            <span>{laporan.desa}</span>
          </>
        )}
        <span>·</span>
        <span>oleh {laporan.petugas || `#${laporan.idpetugas}`}</span>
      </p>

      {sp?.saved && <Banner tone="ok">Perubahan laporan tersimpan.</Banner>}
      {sp?.created && (
        <Banner tone="ok">
          Laporan dibuat — tambahkan foto bukti kegiatan lewat panel Galeri Foto di bawah.
        </Banner>
      )}
      {sp?.hapus && <Banner tone="ok">Foto dihapus dari laporan.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <h2 className="font-semibold pa-hgrad">Detail Laporan</h2>
          <div className="mt-4">
            <LaporanForm laporan={laporan} desaList={desaList} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
            <h2 className="font-semibold pa-hgrad">Galeri Foto ({laporan.foto.length})</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Foto bukti kegiatan — jpg/png/webp, maksimal 2MB per foto.
            </p>
            <div className="mt-3">
              <LaporanGaleriForm idlaporan={laporan.id} />
            </div>
            {laporan.foto.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {laporan.foto.map((f) => (
                  <div
                    key={f.id}
                    className="overflow-hidden rounded-xl border border-emerald-100 dark:border-night-700"
                  >
                    <div className="relative aspect-square bg-emerald-50 dark:bg-night-800">
                      <Image
                        src={f.url}
                        alt={`Foto laporan ${laporan.judul}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 180px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-2 py-2">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                      >
                        Lihat ↗
                      </a>
                      <form action={deleteLaporanFoto}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="idlaporan" value={laporan.id} />
                        <ConfirmSubmit
                          message="Hapus foto ini dari laporan?"
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Hapus
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:bg-night-800 dark:text-zinc-400">
                Belum ada foto untuk laporan ini.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Hapus Laporan
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Laporan dan seluruh fotonya akan dihapus permanen.
            </p>
            <form action={deleteLaporan} className="mt-3">
              <input type="hidden" name="id" value={laporan.id} />
              <ConfirmSubmit
                message={`Hapus laporan "${laporan.judul}" beserta semua fotonya? Tindakan ini tidak bisa dibatalkan.`}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Hapus Laporan
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function Banner({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600 dark:text-red-400"
      }`}
    >
      {children}
    </p>
  );
}
