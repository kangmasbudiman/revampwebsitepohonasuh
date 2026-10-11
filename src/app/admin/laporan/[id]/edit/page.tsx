import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapLaporans, mapLokasi } from "@/lib/api";
import LaporanForm from "@/components/admin/laporan-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteLaporan } from "@/lib/actions/laporan";

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
      <div className="w-full">
        <Link
          href="/admin/laporan"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          ← Daftar Laporan Kegiatan
        </Link>
        <h1 className="mt-3 text-xl font-bold pa-hgrad">Edit Laporan Kegiatan</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {laporan.petugas || `#${laporan.idpetugas}`} · {laporan.tanggal}
        </p>

        {sp?.created && (
          <Banner tone="ok">
            {laporan.status === "draft"
              ? "Draf laporan tersimpan — lengkapi dan kirim kapan saja."
              : "Laporan terkirim dan akan diperiksa oleh tim Pohon Asuh."}
          </Banner>
        )}
        {sp?.saved && <Banner tone="ok">Perubahan laporan tersimpan.</Banner>}
        {sp?.dikirim && (
          <Banner tone="ok">Laporan terkirim dan akan diperiksa oleh tim Pohon Asuh.</Banner>
        )}
        {sp?.disetujui && (
          <Banner tone="ok">Laporan disetujui dan ditandai sudah diperiksa.</Banner>
        )}
        {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

        <div className="mt-5 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <LaporanForm laporan={laporan} desaList={desaList} level={session.level ?? 1} />
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20">
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
