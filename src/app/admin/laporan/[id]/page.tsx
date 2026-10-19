import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Coins,
  FileSignature,
  FileText,
  MapPin,
  NotebookPen,
  Send,
  TreePine,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { requireAdmin } from "@/lib/guard";
import {
  apiGet,
  mapLaporanDetail,
  mapLaporans,
  type ApiLaporanDetail,
} from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";
import LaporanGaleri from "@/components/laporan-galeri";
import LaporanDetailTabs from "@/components/admin/laporan-detail-tabs";
import LaporanPdfButton from "@/components/admin/laporan-pdf";
import MemoForm from "@/components/admin/memo-form";
import MemoPdfButton from "@/components/admin/memo-pdf";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { approveLaporan, revisiLaporan, updatePencairan } from "@/lib/actions/laporan";
import { LAPORAN_JENIS_LABEL } from "@/lib/api";

export const metadata = { title: "Detail Laporan Kegiatan | Pohon Asuh" };

function fmtTanggal(s: string): string {
  if (!s) return "";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtWaktu(s: string): string {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  terkirim: "Terkirim",
  revisi: "Perlu Revisi",
  disetujui: "Disetujui",
};

const STATUS_CHIP: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  terkirim: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  revisi: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  disetujui: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
};

const PENCAIRAN_LABEL: Record<string, string> = {
  menunggu: "Menunggu pencairan",
  diproses: "Sedang diproses",
  dicairkan: "Dana dicairkan",
};

const PENCAIRAN_CHIP: Record<string, string> = {
  menunggu: "bg-zinc-100 text-zinc-700 dark:bg-night-800 dark:text-zinc-300",
  diproses: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  dicairkan: "bg-emerald-600 text-white",
};

const RIWAYAT_META: Record<string, { label: string; icon: typeof Send; warna: string }> = {
  dikirim: { label: "BTOR dikirim", icon: Send, warna: "text-emerald-600 bg-emerald-50 dark:bg-night-800 dark:text-emerald-400" },
  revisi: { label: "Diminta revisi", icon: TriangleAlert, warna: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400" },
  verifikasi: { label: "BTOR diverifikasi", icon: BadgeCheck, warna: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" },
  memo: { label: "Memo diterbitkan", icon: FileText, warna: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400" },
  pencairan: { label: "Status pencairan diperbarui", icon: Wallet, warna: "text-emerald-700 bg-emerald-50 dark:bg-night-800 dark:text-emerald-400" },
};

// Paragraf berawalan tanggal (08 April 2026 / 2026-04-08 / 08-04) menjadi
// judul node timeline catatan BTOR.
const POLA_TANGGAL =
  /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/;

function parseHari(isi: string): { judul: string; teks: string }[] {
  const baris = isi
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const node: { judul: string; teks: string }[] = [];
  let cur: { judul: string; teks: string } | null = null;
  for (const b of baris) {
    if (POLA_TANGGAL.test(b) && b.length <= 40) {
      if (cur) node.push(cur);
      cur = { judul: b, teks: "" };
    } else if (cur) {
      cur.teks = cur.teks ? `${cur.teks}\n${b}` : b;
    } else {
      cur = { judul: "", teks: b };
    }
  }
  if (cur) node.push(cur);
  return node;
}

type Props = PageProps<"/admin/laporan/[id]">;

export default async function DetailLaporanPage(props: Props) {
  const session = await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const idLaporan = Number(id);
  if (!Number.isInteger(idLaporan) || idLaporan <= 0) notFound();
  const isAdmin = (session.level ?? 1) === 1;

  let laporan: ApiLaporanDetail | undefined;
  try {
    laporan = mapLaporanDetail(await apiGet<Record<string, unknown>>(`laporandetail?id=${idLaporan}`));
  } catch {
    laporan = undefined;
  }
  if (!laporan) {
    const row = mapLaporans(await apiGet<Record<string, unknown>[]>(`laporanlist?id=${idLaporan}`))[0];
    laporan = row ? { ...row, pohon: [], riwayat: [] } : undefined;
  }
  if (!laporan) notFound();
  // Petugas hanya boleh membuka laporan miliknya sendiri.
  if (!isAdmin && laporan.idpetugas !== session.userId) notFound();

  const memo = laporan.memo;
  const waktu =
    laporan.tanggalSelesai && laporan.tanggalSelesai !== laporan.tanggal
      ? `${fmtTanggal(laporan.tanggal)} — ${fmtTanggal(laporan.tanggalSelesai)}`
      : fmtTanggal(laporan.tanggal);
  const tim = laporan.timTagging
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rekening = [
    laporan.rekeningBank,
    laporan.rekeningNorek,
    laporan.rekeningAt && `a.n. ${laporan.rekeningAt}`,
  ].filter(Boolean);
  const hari = parseHari(laporan.isi);

  const stepper = [
    { label: "BTOR Diupload", done: laporan.status !== "draft", info: laporan.createdAt ? fmtWaktu(laporan.createdAt) : "" },
    { label: "BTOR Diverifikasi", done: laporan.status === "disetujui", info: "" },
    { label: "Memo Diterbitkan", done: Boolean(memo), info: memo?.nomor ?? "" },
    {
      label: "Pencairan Dana",
      done: memo?.statusPencairan === "dicairkan",
      info: memo ? (PENCAIRAN_LABEL[memo.statusPencairan] ?? memo.statusPencairan) : "",
    },
  ];

  const infoStrip = [
    { icon: CalendarDays, label: "Waktu Kegiatan", value: waktu || "—" },
    {
      icon: MapPin,
      label: "Lokasi",
      value: [laporan.tempat, laporan.desa && namaDesa(laporan.desa)].filter(Boolean).join(" · ") || "—",
    },
    { icon: Users, label: "Tim Tagging", value: tim.length > 0 ? `${tim.join(", ")}` : laporan.petugas || "—" },
    { icon: Wallet, label: "Rekening LPHN", value: rekening.join(" · ") || "—" },
  ];

  const tabs = [
    {
      key: "ringkasan",
      label: "Ringkasan",
      content: (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
            <p className="whitespace-pre-line text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">
              {laporan.isi}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {laporan.hasil.trim() && (
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Hasil / Manfaat
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {laporan.hasil}
                </p>
              </div>
            )}
            {laporan.dana !== null && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 dark:border-night-700 dark:bg-night-900">
                <Coins className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dana digunakan</p>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300" data-testid="detail-dana">
                    {rupiah(laporan.dana)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                <TreePine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Pohon yang Ditagging
              </h3>
              <span
                className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                data-testid="detail-jml-pohon"
              >
                {laporan.pohon.length} pohon
              </span>
            </div>
            {laporan.pohon.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Belum ada pohon yang dipilih untuk laporan ini.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="pb-2 pr-4 font-semibold">Kode</th>
                      <th className="pb-2 pr-4 font-semibold">Pohon</th>
                      <th className="pb-2 pr-4 font-semibold">Desa</th>
                      <th className="pb-2 pr-4 font-semibold">Donatur</th>
                      <th className="pb-2 font-semibold">Foto Tagging</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
                    {laporan.pohon.map((p) => (
                      <tr key={p.idadopsi}>
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/admin/pohon/${encodeURIComponent(p.idpohon)}`}
                            className="font-mono text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {p.idpohon}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-700 dark:text-zinc-300">{p.localname}</td>
                        <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">
                          {p.desa ? namaDesa(p.desa) : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">{p.donatur || "—"}</td>
                        <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5" />
                            {p.jmlFoto}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "btor",
      label: "Detail Kegiatan (BTOR)",
      content: (
        <ol className="relative space-y-5 border-l-2 border-emerald-200 pl-8 dark:border-night-700">
          {hari.map((h, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-emerald-100 dark:ring-night-800" />
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
                {h.judul && (
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    {h.judul}
                  </p>
                )}
                <p className="whitespace-pre-line leading-7 text-zinc-600 dark:text-zinc-300">
                  {h.teks || h.judul}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ),
    },
    {
      key: "foto",
      label: "Foto & Dokumentasi",
      badge: laporan.foto.length > 0 ? String(laporan.foto.length) : undefined,
      content:
        laporan.foto.length > 0 ? (
          <LaporanGaleri judul={laporan.judul} fotos={laporan.foto} />
        ) : (
          <p className="rounded-2xl border border-dashed border-emerald-200 px-4 py-10 text-center text-sm text-zinc-500 dark:border-night-700 dark:text-zinc-400">
            Belum ada foto dokumentasi.
          </p>
        ),
    },
    {
      key: "memo",
      label: "Memo",
      content: (
        <div className="space-y-5">
          {memo ? (
            <>
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900" data-testid="memo-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      <FileSignature className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Memo Pencairan {memo.nomor}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Diterbitkan {fmtTanggal(memo.tanggal)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${PENCAIRAN_CHIP[memo.statusPencairan] ?? PENCAIRAN_CHIP.menunggu}`}
                    data-testid="memo-status"
                  >
                    {PENCAIRAN_LABEL[memo.statusPencairan] ?? memo.statusPencairan}
                  </span>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-zinc-500 dark:text-zinc-400">Jumlah dana</dt>
                    <dd className="font-bold text-emerald-800 dark:text-emerald-300" data-testid="memo-jumlah">
                      {rupiah(memo.jumlah)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-zinc-500 dark:text-zinc-400">Penerima</dt>
                    <dd className="text-zinc-700 dark:text-zinc-200">{memo.penerima}</dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-zinc-500 dark:text-zinc-400">Rekening</dt>
                    <dd className="text-zinc-700 dark:text-zinc-200">
                      {[memo.bank, memo.norek].filter(Boolean).join(" · ") || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 sm:block">
                    <dt className="text-zinc-500 dark:text-zinc-400">Keperluan</dt>
                    <dd className="text-zinc-700 dark:text-zinc-200">{memo.keperluan || "—"}</dd>
                  </div>
                  {memo.ttdNama && (
                    <div className="flex justify-between gap-4 sm:block">
                      <dt className="text-zinc-500 dark:text-zinc-400">Penandatangan</dt>
                      <dd className="text-zinc-700 dark:text-zinc-200">
                        {memo.ttdNama}
                        {memo.ttdJabatan ? ` (${memo.ttdJabatan})` : ""}
                      </dd>
                    </div>
                  )}
                  {memo.catatanPencairan && (
                    <div className="flex justify-between gap-4 sm:block">
                      <dt className="text-zinc-500 dark:text-zinc-400">Catatan</dt>
                      <dd className="text-zinc-700 dark:text-zinc-200">{memo.catatanPencairan}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-5 flex flex-wrap gap-2">
                  <MemoPdfButton laporan={laporan} memo={memo} />
                </div>
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Status Pencairan Dana
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Perbarui sesuai perkembangan pencairan — tercatat di riwayat laporan.
                  </p>
                  <form action={updatePencairan} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="idlaporan" value={laporan.id} />
                    <input type="hidden" name="id_memo" value={memo.id} />
                    <label className="flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Status
                      <select
                        name="status_pencairan"
                        defaultValue={memo.statusPencairan}
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                      >
                        <option value="menunggu">Menunggu pencairan</option>
                        <option value="diproses">Sedang diproses</option>
                        <option value="dicairkan">Dana dicairkan</option>
                      </select>
                    </label>
                    <label className="flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Catatan <span className="text-zinc-400">(opsional)</span>
                      <input
                        name="catatan_pencairan"
                        type="text"
                        defaultValue={memo.catatanPencairan}
                        placeholder="mis. Ditransfer 16 April 2026"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Perbarui
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-8 text-center text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Memo Pencairan diterbitkan admin setelah BTOR diverifikasi — memo menjadi dasar
              pencairan dana kegiatan.
            </p>
          )}

          {isAdmin && laporan.status === "disetujui" && <MemoForm laporan={laporan} />}
        </div>
      ),
    },
    {
      key: "riwayat",
      label: "Riwayat",
      badge: laporan.riwayat.length > 0 ? String(laporan.riwayat.length) : undefined,
      content: (
        <ol className="relative space-y-5 border-l-2 border-emerald-200 pl-8 dark:border-night-700">
          {laporan.riwayat.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada riwayat proses.</p>
          )}
          {[...laporan.riwayat].reverse().map((h, i) => {
            const meta = RIWAYAT_META[h.aksi] ?? {
              label: h.aksi,
              icon: FileText,
              warna: "text-zinc-600 bg-zinc-100 dark:text-zinc-300 dark:bg-night-800",
            };
            return (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[43px] flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white dark:ring-night-900 ${meta.warna}`}
                >
                  <meta.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{meta.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[fmtWaktu(h.waktu), h.oleh && `oleh ${h.oleh}`].filter(Boolean).join(" · ")}
                  </p>
                  {h.catatan && (
                    <p className="mt-1 whitespace-pre-line rounded-xl bg-zinc-50 px-3.5 py-2 text-sm text-zinc-600 dark:bg-night-800 dark:text-zinc-300">
                      {h.catatan}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ),
    },
  ];

  return (
    <main className="w-full px-6 py-8 lg:px-10" data-testid={`laporan-detail-${laporan.id}`}>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/laporan" className="font-medium text-emerald-700 hover:underline dark:text-emerald-300">
          Laporan Kegiatan
        </Link>{" "}
        <span className="mx-1">›</span> <span className="line-clamp-1">{laporan.judul}</span>
      </p>

      {sp?.revisi && <Banner tone="warn">Revisi diminta — petugas akan memperbaiki dan mengirim ulang laporan.</Banner>}
      {sp?.diverifikasi && <Banner tone="ok">BTOR diverifikasi. Sekarang memo pencairan bisa diterbitkan.</Banner>}
      {sp?.memo && <Banner tone="ok">Memo pencairan tersimpan.</Banner>}
      {sp?.pencairan && <Banner tone="ok">Status pencairan diperbarui.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
              {LAPORAN_JENIS_LABEL[laporan.jenis] ?? laporan.jenis}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CHIP[laporan.status] ?? STATUS_CHIP.terkirim}`}
              data-testid="detail-status"
            >
              {STATUS_LABEL[laporan.status] ?? laporan.status}
            </span>
            {memo && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${PENCAIRAN_CHIP[memo.statusPencairan] ?? PENCAIRAN_CHIP.menunggu}`}
              >
                {PENCAIRAN_LABEL[memo.statusPencairan] ?? memo.statusPencairan}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-emerald-950 dark:text-emerald-100">{laporan.judul}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {laporan.petugas}
            {laporan.jabatan ? ` · ${laporan.jabatan}` : ""} · {waktu}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LaporanPdfButton laporan={laporan} />
          {(isAdmin || laporan.idpetugas === session.userId) && laporan.status !== "disetujui" && (
            <Link
              href={`/admin/laporan/${laporan.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              <NotebookPen className="h-4 w-4" />
              Edit Laporan
            </Link>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900 sm:grid-cols-2 xl:grid-cols-4">
        {infoStrip.map((s) => (
          <div key={s.label} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-night-800 dark:text-emerald-400">
              <s.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{s.label}</p>
              <p className="mt-0.5 break-words text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Catatan revisi */}
      {laporan.status === "revisi" && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/50 dark:bg-orange-950/30">
          <p className="flex items-center gap-2 text-sm font-bold text-orange-800 dark:text-orange-300">
            <TriangleAlert className="h-4 w-4" />
            Perlu revisi
          </p>
          {laporan.catatanRevisi && (
            <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-orange-900 dark:text-orange-200">
              “{laporan.catatanRevisi}”
            </p>
          )}
        </div>
      )}

      {/* Stepper status proses */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
        <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Status Proses</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4" data-testid="stepper">
          {stepper.map((s, i) => (
            <li key={s.label} className="relative">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    s.done
                      ? "bg-emerald-600 text-white"
                      : "border-2 border-zinc-200 text-zinc-400 dark:border-night-700"
                  }`}
                >
                  {s.done ? <BadgeCheck className="h-4 w-4" /> : i + 1}
                </span>
                <p
                  className={`text-sm font-semibold ${s.done ? "text-emerald-800 dark:text-emerald-300" : "text-zinc-400"}`}
                  data-testid={`stepper-${i + 1}`}
                >
                  {s.label}
                </p>
              </div>
              {s.info && <p className="mt-1 pl-10 text-xs text-zinc-500 dark:text-zinc-400">{s.info}</p>}
            </li>
          ))}
        </ol>
      </div>

      {/* Aksi admin: verifikasi / minta revisi */}
      {isAdmin && laporan.status === "terkirim" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 dark:border-night-700 dark:bg-night-900">
          <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-300">
            Periksa detail kegiatan, hasil tagging, dan dokumentasi sebelum memverifikasi BTOR.
          </p>
          <form action={approveLaporan}>
            <input type="hidden" name="id" value={laporan.id} />
            <ConfirmSubmit
              message={`Verifikasi BTOR "${laporan.judul}"? Setelah terverifikasi, memo pencairan bisa diterbitkan.`}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <BadgeCheck className="mr-1.5 inline h-4 w-4" />
              Verifikasi BTOR
            </ConfirmSubmit>
          </form>
          <details className="w-full sm:w-auto">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-orange-300 px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/40">
              <TriangleAlert className="h-4 w-4" />
              Minta Revisi
            </summary>
            <form action={revisiLaporan} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={laporan.id} />
              <input
                name="catatan"
                type="text"
                required
                placeholder="Catatan apa yang harus diperbaiki…"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 sm:w-96"
              />
              <button
                type="submit"
                className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Kirim Permintaan Revisi
              </button>
            </form>
          </details>
        </div>
      )}

      <div className="mt-6">
        <LaporanDetailTabs tabs={tabs} />
      </div>
    </main>
  );
}

function Banner({ tone, children }: { tone: "ok" | "warn" | "err"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    warn: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
    err: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  }[tone];
  return <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${cls}`}>{children}</p>;
}
