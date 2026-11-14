import { apiGet, mapDesa, mapTrees, type ApiDesa, type ApiTree } from "@/lib/api";
import { requireAdminLevel } from "@/lib/guard";
import Link from "next/link";
import TreeForm from "@/components/admin/tree-form";
import PohonTable from "@/components/admin/pohon-table";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Admin — Kelola Pohon" };

export default async function AdminTreePage(props: PageProps<"/admin/pohon">) {
  await requireAdminLevel();
  const searchParams = await props.searchParams;

  // Tabel kini paginasi server-side (API pohonmapall?page=…) supaya tidak
  // memuat ribuan pohon sekali jalan; filter & urutan lewat URL.
  const page = Math.max(1, Number(searchParams.page) || 1);
  const perPage = Math.min(200, Math.max(5, Number(searchParams.per) || 50));
  const q = String(searchParams.q ?? "");
  const desa = String(searchParams.desa ?? "");
  const status = String(searchParams.status ?? "");
  const unggulan = String(searchParams.unggulan ?? "");
  const urut = searchParams.sort === "tinggi" ? (searchParams.dir === "asc" ? "asc" : "desc") : "off";

  let trees: ApiTree[] = [];
  let total = 0;
  try {
    const sp = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (q) sp.set("q", q);
    if (desa) sp.set("desa", desa);
    if (status) sp.set("status", status);
    // Tab "Dipesan" = filter status RESERVED_ADMIN (konsep frontend).
    if (unggulan === "dipesan") {
      sp.set("status", "RESERVED_ADMIN");
    } else if (unggulan) {
      sp.set("unggulan", unggulan);
    }
    if (urut !== "off") {
      sp.set("sort", "tinggi");
      sp.set("dir", urut);
    }
    const res = await apiGet<{ data?: Record<string, unknown>[]; total?: number }>(
      `pohonmapall?${sp.toString()}`,
    );
    trees = mapTrees(res.data ?? []);
    total = Number(res.total) || 0;
  } catch {
    // tampilkan tabel kosong di bawah
  }

  // Hitungan label tab (dua permintaan ringan — hanya total, per_page=1).
  let jmlUnggulan = 0;
  let jmlDipesan = 0;
  try {
    const [ung, dipes] = await Promise.all([
      apiGet<{ total?: number }>("pohonmapall?page=1&per_page=1&unggulan=1"),
      apiGet<{ total?: number }>("pohonmapall?page=1&per_page=1&status=RESERVED_ADMIN"),
    ]);
    jmlUnggulan = Number(ung.total) || 0;
    jmlDipesan = Number(dipes.total) || 0;
  } catch {
    // label tanpa angka
  }

  let desaList: ApiDesa[] = [];
  try {
    desaList = (await apiGet<Record<string, unknown>[]>("getdesa")).map(mapDesa);
  } catch {
    // dropdown lokasi kosong
  }

  let members: { id: number; name: string; emaile: string }[] = [];
  try {
    const mrows = await apiGet<Record<string, unknown>[]>("getmembers");
    members = mrows.map((m) => ({
      id: Number(m.id),
      name: String(m.name ?? ""),
      emaile: String(m.emaile ?? ""),
    }));
  } catch {
    // dropdown akun kosong
  }
  const pohonBaru = searchParams.created
    ? trees.find((t) => t.code === String(searchParams.created))
    : undefined;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold pa-hgrad">Kelola Pohon</h1>
        <Link
          href="/admin/pohon/beku"
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-night-800"
        >
          ❄ Pembekuan Pohon
        </Link>
      </div>

      {searchParams.deleted && (
        <SuccessPopup paramKey="deleted" title="Terhapus">
          Pohon dihapus.
        </SuccessPopup>
      )}
      {searchParams.unggulan === "1" && (
        <SuccessPopup paramKey="unggulan" title="Unggulan Aktif">
          Pohon ditandai unggulan — tampil di beranda.
        </SuccessPopup>
      )}
      {searchParams.unggulan === "0" && (
        <SuccessPopup paramKey="unggulan" title="Unggulan Dilepas">
          Status unggulan dilepas.
        </SuccessPopup>
      )}
      {searchParams.dipesan && (
        <SuccessPopup paramKey="dipesan" title="Pohon Dipesan — Invoice Dibuat">
          {Number(searchParams.jumlah) || 1} pohon dipesan — statusnya kini Dipesan
          Admin dan tidak bisa diadopsi pengunjung.
          {searchParams.invoice && (
            <>
              {" "}
              Invoice{" "}
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {String(searchParams.invoice)}
              </span>{" "}
              menunggu pembayaran —{" "}
              <Link
                href={`/admin/verifikasi/${Number(searchParams.idconfirmasi) || ""}`}
                className="font-semibold text-emerald-700 underline"
              >
                buka Verifikasi Pembayaran
              </Link>
              .
            </>
          )}
          {Number(searchParams.lewati) > 0 && (
            <>
              {" "}
              {Number(searchParams.lewati)} pohon dilewati (sudah diadopsi, dipesan,
              atau dibekukan).
            </>
          )}
        </SuccessPopup>
      )}
      {searchParams.dibatalkan && (
        <SuccessPopup paramKey="dibatalkan" title="Pesanan Dibatalkan">
          {Number(searchParams.jumlah) > 1
            ? `${Number(searchParams.jumlah)} pesanan dibatalkan`
            : "Reservasi dibatalkan"}{" "}
          — pohon kembali tersedia untuk umum.
          {Number(searchParams.lewati) > 0 && (
            <>
              {" "}
              {Number(searchParams.lewati)} dilewati (bukan status Dipesan Admin).
            </>
          )}
        </SuccessPopup>
      )}
      {searchParams.beku === "1" && (
        <SuccessPopup paramKey="beku" title="Pohon Dibekukan">
          {Number(searchParams.jumlah) || 1} pohon dibekukan — tetap tampil di daftar publik,
          tetapi tidak bisa diadopsi.{" "}
          <Link href="/admin/pohon/beku" className="font-semibold text-emerald-700 underline">
            Menu Pembekuan Pohon
          </Link>
        </SuccessPopup>
      )}
      {searchParams.beku === "0" && (
        <SuccessPopup paramKey="beku" title="Pembekuan Dibuka">
          {Number(searchParams.jumlah) || 1} pohon diaktifkan kembali.
        </SuccessPopup>
      )}
      {searchParams.error && (
        <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(searchParams.error)}
        </SuccessPopup>
      )}

      {searchParams.created && (
        <SuccessPopup
          paramKey="created"
          title="Pohon berhasil ditambahkan"
          subtitle={pohonBaru ? `${pohonBaru.localName} · ${pohonBaru.code}` : String(searchParams.created)}
        >
          Pohon{" "}
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:bg-night-800 dark:text-zinc-200">
            {String(searchParams.created)}
          </span>{" "}
          tersimpan dan langsung tampil di tabel di bawah.
        </SuccessPopup>
      )}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">
          + Tambah Pohon Baru
        </summary>
        <div className="mt-4">
          <TreeForm desas={desaList.map((d) => ({ name: d.name }))} />
        </div>
      </details>

      {/* Remount saat hasil aksi reservasi masuk URL — pilihan checkbox ikut
          kosong otomatis tanpa perlu effect di komponen. */}
      <PohonTable
        key={`${searchParams.dipesan ?? ""}-${searchParams.dibatalkan ?? ""}`}
        trees={trees}
        total={total}
        page={page}
        perPage={perPage}
        q={q}
        desa={desa}
        status={status}
        unggulan={unggulan}
        urut={urut}
        desas={desaList.map((d) => d.name)}
        jmlUnggulan={jmlUnggulan}
        jmlDipesan={jmlDipesan}
        members={members}
      />
    </main>
  );
}
