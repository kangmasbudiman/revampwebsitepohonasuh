import Link from "next/link";
import {
  apiGet,
  apiPost,
  mapDesa,
  mapPengajuanBeku,
  mapTrees,
  type ApiDesa,
  type ApiPengajuanBeku,
  type ApiTree,
} from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import PembekuanPanel from "@/components/admin/pembekuan-panel";
import PembekuanTable from "@/components/admin/pembekuan-table";
import PengajuanForm from "@/components/admin/pengajuan-form";
import PengajuanTable from "@/components/admin/pengajuan-table";

export const metadata = { title: "Admin — Pembekuan Pohon" };
export const dynamic = "force-dynamic";

export default async function PembekuanPohonPage(props: PageProps<"/admin/pohon/beku">) {
  const session = await requireAdmin();
  const adminUtama = (session.level ?? 1) === 1;
  const searchParams = await props.searchParams;
  const spKey = JSON.stringify(searchParams);

  // Ambil parameter desa dari URL (?desa=nama)
  const desaDariParam = searchParams.desa as string | string[] | undefined;
  const desaTerpilih = typeof desaDariParam === "string" ? desaDariParam : null;

  let trees: ApiTree[] = [];
  let desas: ApiDesa[] = [];
  let pengajuan: ApiPengajuanBeku[] = [];
  let frozen: ApiTree[] = [];
  let frozenJumlah = 0;

  try {
    trees = mapTrees(await apiGet<Record<string, unknown>[]>("pohonmapall"));
    desas = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
    const rows = await apiPost<Record<string, unknown>[]>("getpengajuanbeku", {
      idmember: session.userId,
    });
    pengajuan = (Array.isArray(rows) ? rows : []).map(mapPengajuanBeku);

    // Jika ada desa yang dipilih dari URL, filter pohon beku hanya untuk desa tersebut
    if (desaTerpilih) {
      const frozenDariTrees = trees.filter((t) => t.frozen && t.desa === desaTerpilih);
      frozen = frozenDariTrees;
      frozenJumlah = frozenDariTrees.length;
    } else {
      // Default: tampilkan semua pohon beku (admin utama)
      const allFrozen = trees.filter((t) => t.frozen);
      frozen = allFrozen;
      frozenJumlah = allFrozen.length;
    }
  } catch {
    frozen = [];
    frozenJumlah = 0;
  }

  // Daftar nama desa untuk admin utama (semua), atau hanya desa sendiri untuk pengelola
  let namaDesaList: string[] = [];
  if (adminUtama) {
    namaDesaList = [...new Set(desas.map((d) => d.name))].sort();
  } else {
    const desasSaya = desas.filter((d) => d.adminDesaId === session.userId).map((d) => d.name);
    namaDesaList = desasSaya.sort();
  }

  // Jika ada desa terpilih, tampilkan info dan tabel untuk desa tersebut
  // Jika tidak, tampilkan daftar desa untuk dipilih
  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/pohon" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Pohon
      </Link>
      <h1 className="mt-3 text-3xl font-bold pa-hgrad">Pembekuan Pohon</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
        {adminUtama ? (
          <>
            Pohon yang dibekukan tetap tampil di website publik (foto, nama, jenis, dan lokasi),
            tetapi tidak bisa diadopsi sampai pembekuan dibuka — otomatis setelah batas waktu
            (bila dipilih sementara) atau manual oleh admin.
          </>
        ) : (
          <>
            Anda dapat mengajukan pembekuan pohon di desa yang Anda kelola (mis. pohon tumbang
            atau rusak). Pengajuan baru berjalan setelah disetujui admin utama.
          </>
        )}
      </p>

      {/* Bagian atas: pilihan desa atau info desa terpilih */}
      {desaTerpilih ? (
        <div className="mt-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Menampilkan pohon beku di: <strong>{desaTerpilih}</strong>
            {frozenJumlah === 0 ? "" : ` (${frozen.length} pohon beku)`}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {namaDesaList.map((nama) => (
            <div
              key={nama}
              onClick={() => window.location.href = `/admin/pohon/beka?desa=${encodeURIComponent(nama)}`}
              className={desaTerpilih === nama
                ? "bg-emerald-100 dark:bg-night-800 border-emerald-200 rounded-xl p-4 hover:bg-emerald-200 dark:hover:bg-night-700 transition-colors"
                : "border rounded-xl p-3 hover:bg-white dark:hover:bg-night-900 transition-colors cursor-pointer"
            }
          >
            <div className="font-medium text-emerald-950 dark:text-zinc-100">{nama}</div>
            <div className="text-xs text-emerald-500 dark:text-emerald-400">
              {frozenJumlah} pohon beku
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Tabel pohon beku */}
      <div className="mt-8">
        <PembekuanTable frozen={frozen} />
      </div>

      {/* Sisa komponen tetap sama */}
      <Link href="/admin/pohon" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Pohon
      </Link>
      <h1 className="mt-3 text-3xl font-bold pa-hgrad">Pembekuan Pohon</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
        {adminUtama ? (
          <>
            Pohon yang dibekukan tetap tampil di website publik (foto, nama, jenis, dan lokasi),
            tetapi tidak bisa diadopsi sampai pembekuan dibuka — otomatis setelah batas waktu
            (bila dipilih sementara) atau manual oleh admin.
          </>
        ) : (
          <>
            Anda dapat mengajukan pembekuan pohon di desa yang Anda kelola (mis. pohon tumbang
            atau rusak). Pengajuan baru berjalan setelah disetujui admin utama.
          </>
        )}
      </p>

      {searchParams.beku === "1" && (
        <SuccessPopup paramKey="beku" title="Pohon Dibekukan">
          {Number(searchParams.jumlah) || 0} pohon dibekukan — tetap tampil di daftar publik,
          tetapi tidak bisa diadopsi.
          {Number(searchParams.lewati) > 0 && (
            <> {Number(searchParams.lewati)} pohon dilewati karena tidak tersedia.</>
          )}
        </SuccessPopup>
      )}
      {searchParams.beku === "0" && (
        <SuccessPopup paramKey="beku" title="Pembekuan Dibuka">
          {Number(searchParams.jumlah) || 0} pohon diaktifkan kembali dan bisa diadopsi.
        </SuccessPopup>
      )}
      {searchParams.diaju === "1" && (
        <SuccessPopup paramKey="diaju" title="Pengajuan Terkirim">
          Pengajuan pembekuan terkirim — menunggu persetujuan admin utama. Status dapat
          dipantau di riwayat di bawah.
        </SuccessPopup>
      )}
      {searchParams.acc === "1" && (
        <SuccessPopup paramKey="acc" title="Pengajuan Disetujui">
          {Number(searchParams.jumlah) || 0} pohon dibekukan sesuai pengajuan.
        </SuccessPopup>
      )}
      {searchParams.tolak === "1" && (
        <SuccessPopup paramKey="tolak" title="Pengajuan Ditolak">
          Pengajuan ditolak — catatan (bila ada) dikirim ke pengaju.
        </SuccessPopup>
      )}
      {searchParams.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(searchParams.error)}
        </SuccessPopup>
      )}

      {adminUtama ? (
        <>
          {/* Permintaan dari pengelola desa di bagian atas agar cepat terlihat */}
          <PengajuanTable key={spKey} rows={pengajuan} peran="admin" />
          <PembekuanPanel desas={namaDesaList} tersedia={trees.length > 0 ? trees : []} />
          <PembekuanTable frozen={frozen} />
        </>
      ) : (
        <>
          <PengajuanForm desas={namaDesaList} tersedia={trees.length > 0 ? trees : []} />
          <PembekuanTable frozen={frozen} bisaBuka={false} />
          <PengajuanTable key={spKey} rows={pengajuan} peran="pengelola" />
        </>
      )}
    </main>
  );
}
