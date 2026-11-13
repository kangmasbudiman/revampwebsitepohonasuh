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
import { labelLokasi, namaDesa, sebutanDesa } from "@/lib/format";
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

  // Desa dipilih lewat URL (?desa=nama) supaya tautan bisa dibagikan/di-refresh.
  const desaParam = searchParams.desa;
  const desaTerpilih =
    typeof desaParam === "string" && desaParam.trim() ? desaParam.trim() : null;

  let pohonBeku: ApiTree[] = [];
  let tersediaAll: ApiTree[] = [];
  let desas: ApiDesa[] = [];
  let pengajuan: ApiPengajuanBeku[] = [];
  let gagalMuat = false;

  try {
    // Endpoint ringan khusus pohon beku (beku=yes) + pohon tersedia untuk
    // panel pembekuan. Hindari pohonmapall: ribuan baris dengan query per
    // pohon membuat halaman ini menggantung.
    const bekuRaw = await apiGet<unknown>("pohonbeku");
    const bekuItems: Record<string, unknown>[] = Array.isArray(bekuRaw)
      ? bekuRaw
      : Array.isArray((bekuRaw as { items?: unknown })?.items)
        ? ((bekuRaw as { items: Record<string, unknown>[] }).items)
        : [];
    pohonBeku = mapTrees(bekuItems);
    tersediaAll = mapTrees(
      await apiPost<Record<string, unknown>[]>("filtertrees", { adopted: "available" }),
    );
    desas = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
    const rows = await apiPost<Record<string, unknown>[]>("getpengajuanbeku", {
      idmember: session.userId,
    });
    pengajuan = (Array.isArray(rows) ? rows : []).map(mapPengajuanBeku);
  } catch {
    gagalMuat = true;
  }

  // Desa yang dikelola pengelola desa (admin utama melihat semua desa).
  const desaSaya = desas.filter((d) => d.adminDesaId === session.userId);
  const namaDiizinkan = adminUtama ? null : new Set(desaSaya.map((d) => d.name));

  // Semua pohon beku yang boleh dilihat pengguna ini (endpoint sudah
  // memfilter beku=yes; desa pengelola dibatasi).
  const semuaBeku = pohonBeku.filter(
    (t) => t.frozen && (!namaDiizinkan || namaDiizinkan.has(t.desa)),
  );

  // Kandidat pohon untuk panel "Bekukan Pohon": yang masih tersedia,
  // bukan pohon beku, dan hanya desa milik pengelola.
  const tersedia = tersediaAll
    .filter((t) => !t.frozen && (!namaDiizinkan || namaDiizinkan.has(t.desa)))
    .map(({ code, localName, desa }) => ({ code, localName, desa }));

  // Rekap jumlah pohon beku per desa, terbanyak lebih dulu.
  const jumlahPerDesa = new Map<string, number>();
  for (const t of semuaBeku) {
    jumlahPerDesa.set(t.desa, (jumlahPerDesa.get(t.desa) ?? 0) + 1);
  }

  const infoDesa = new Map(desas.map((d) => [d.name, d]));
  const daftarDesa = [...jumlahPerDesa.entries()]
    .map(([nama, jumlah]) => {
      const d = infoDesa.get(nama);
      return {
        nama,
        jumlah,
        tampil: d ? labelLokasi(d) : namaDesa(nama),
        sebutan: sebutanDesa(d?.provinsi),
      };
    })
    .sort((a, b) => b.jumlah - a.jumlah || a.tampil.localeCompare(b.tampil, "id"));

  // Daftar desa untuk pilihan pada panel pembekuan / form pengajuan.
  const namaDesaList = (adminUtama ? desas : desaSaya).map((d) => d.name).sort();

  const frozen = desaTerpilih
    ? semuaBeku.filter((t) => t.desa === desaTerpilih)
    : [];
  const infoDesaTerpilih = desaTerpilih ? infoDesa.get(desaTerpilih) : undefined;

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

      {gagalMuat && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          Data pohon belum bisa dimuat dari server. Coba muat ulang halaman beberapa saat lagi.
        </div>
      )}

      {desaTerpilih ? (
        <>
          <div className="mt-6">
            <Link
              href="/admin/pohon/beku"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              ← Semua desa
            </Link>
            <h2 className="mt-2 text-xl font-bold text-emerald-950 dark:text-zinc-100">
              {infoDesaTerpilih
                ? `${sebutanDesa(infoDesaTerpilih.provinsi)} ${labelLokasi(infoDesaTerpilih)}`
                : namaDesa(desaTerpilih)}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              <strong className="font-semibold text-emerald-800 dark:text-emerald-300">
                {frozen.length} pohon beku
              </strong>{" "}
              di desa ini.
            </p>
          </div>

          <PembekuanTable
            frozen={frozen}
            bisaBuka={adminUtama}
            balik={`/admin/pohon/beku?desa=${encodeURIComponent(desaTerpilih)}`}
          />

          {frozen.length === 0 && (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Tidak ada pohon yang sedang dibekukan di desa ini.{" "}
              <Link href="/admin/pohon/beku" className="text-emerald-700 hover:underline">
                Kembali ke daftar desa
              </Link>
              .
            </p>
          )}
        </>
      ) : (
        <>
          <section className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-emerald-950 dark:text-zinc-100">
                Pilih Desa
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {semuaBeku.length} pohon beku di {daftarDesa.length} desa
              </p>
            </div>

            {daftarDesa.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {daftarDesa.map((d) => (
                  <Link
                    key={d.nama}
                    href={{ pathname: "/admin/pohon/beku", query: { desa: d.nama } }}
                    className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-night-700 dark:bg-night-950 dark:hover:border-emerald-700 dark:hover:bg-night-900"
                  >
                    <p className="text-xs font-medium tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                      {d.sebutan}
                    </p>
                    <p className="mt-1 text-base font-semibold text-emerald-950 dark:text-zinc-100">
                      {d.tampil}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                        {d.jumlah} pohon beku
                      </span>
                      <span
                        aria-hidden
                        className="text-sm text-emerald-500 transition-transform group-hover:translate-x-0.5 dark:text-emerald-400"
                      >
                        Lihat →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-night-700 dark:text-zinc-400">
                {gagalMuat
                  ? "Data desa belum tersedia."
                  : "Belum ada pohon yang dibekukan."}
              </p>
            )}
          </section>

          {adminUtama ? (
            <>
              {/* Permintaan dari pengelola desa di bagian atas agar cepat terlihat */}
              <PengajuanTable key={spKey} rows={pengajuan} peran="admin" />
              <PembekuanPanel desas={namaDesaList} tersedia={tersedia} />
            </>
          ) : (
            <>
              <PengajuanForm desas={namaDesaList} tersedia={tersedia} />
              <PengajuanTable key={spKey} rows={pengajuan} peran="pengelola" />
            </>
          )}
        </>
      )}
    </main>
  );
}
