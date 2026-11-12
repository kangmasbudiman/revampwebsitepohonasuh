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
// Data pohon & pengajuan sering berubah lewat server action lain (setujui,
// bekukan) — jangan pakai cache router agar tabel selalu segar.
export const dynamic = "force-dynamic";

// Menu "Pembekuan Pohon" untuk dua peran:
// - Admin utama (level 1): membekukan langsung + menyetujui/menolak
//   pengajuan pembekuan dari pengelola desa.
// - Pengelola desa (level 2, admin_desa): mengajukan pembekuan pohon di
//   desanya — baru berjalan setelah disetujui admin utama.
export default async function PembekuanPohonPage(props: PageProps<"/admin/pohon/beku">) {
  const session = await requireAdmin();
  const adminUtama = (session.level ?? 1) === 1;
  const searchParams = await props.searchParams;
  // Kunci remount: setelah server action me-redirect (param berubah),
  // tabel pengajuan dibuat ulang sehingga modal Tolak tertutup otomatis.
  const spKey = JSON.stringify(searchParams);

  let trees: ApiTree[] = [];
  let desas: ApiDesa[] = [];
  let pengajuan: ApiPengajuanBeku[] = [];
  try {
    trees = mapTrees(await apiGet<Record<string, unknown>[]>("pohonmapall"));
    desas = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
    const rows = await apiPost<Record<string, unknown>[]>("getpengajuanbeku", {
      idmember: session.userId,
    });
    pengajuan = (Array.isArray(rows) ? rows : []).map(mapPengajuanBeku);
  } catch {
    // tampilkan kosong di bawah
  }

  // Pengelola: batasi ke desa yang dikelolanya (desa.admin_desa_id = member).
  const desasSaya = adminUtama
    ? []
    : desas.filter((d) => d.adminDesaId === session.userId).map((d) => d.name);
  const scopeTrees = adminUtama ? trees : trees.filter((t) => desasSaya.includes(t.desa));

  const tersedia = scopeTrees
    .filter((t) => t.status === "AVAILABLE" && !t.frozen && !t.reservedAdmin)
    .map((t) => ({ code: t.code, localName: t.localName, desa: t.desa }));
  const frozen = scopeTrees.filter((t) => t.frozen);
  const namaDesaList = adminUtama
    ? [...new Set(desas.map((d) => d.name))].sort()
    : desasSaya.sort();

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
          <PembekuanPanel desas={namaDesaList} tersedia={tersedia} />
          <PembekuanTable frozen={frozen} />
          <PengajuanTable key={spKey} rows={pengajuan} peran="admin" />
        </>
      ) : (
        <>
          <PengajuanForm desas={namaDesaList} tersedia={tersedia} />
          <PembekuanTable frozen={frozen} bisaBuka={false} />
          <PengajuanTable key={spKey} rows={pengajuan} peran="pengelola" />
        </>
      )}
    </main>
  );
}
