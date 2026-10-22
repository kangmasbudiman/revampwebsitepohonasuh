import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guard";
import { apiGet, mapBtorDetail, mapPenugasan, type ApiBtorDetail, type ApiPenugasan } from "@/lib/api";
import BtorForm from "@/components/admin/btor-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import SuccessPopup from "@/components/admin/success-popup";
import { hapusBtor } from "@/lib/actions/btor";

export const metadata = { title: "Edit BTOR | Pohon Asuh" };

export default async function EditBtorPage(
  props: PageProps<"/admin/btor/[id]/edit">,
) {
  const session = await requireAdmin();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const idBtor = Number(id);
  if (!idBtor) notFound();

  let btor: ApiBtorDetail;
  try {
    btor = mapBtorDetail(await apiGet<Record<string, unknown>>(`btordetail?id=${idBtor}`));
  } catch {
    notFound();
  }
  // Petugas hanya boleh membuka BTOR miliknya sendiri.
  if ((session.level ?? 1) !== 1 && btor.idpetugas !== session.userId) notFound();
  // Isi hanya bisa diubah saat draft/revisi; selain itu arahkan ke detail.
  if (!["draft", "revisi"].includes(btor.status)) notFound();

  let penugasan: ApiPenugasan = { desa: [], petugas: [] };
  try {
    penugasan = mapPenugasan(await apiGet<Record<string, unknown>>("penugasandesa"));
  } catch {
    penugasan = { desa: [], petugas: [] };
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="w-full">
        <Link
          href={`/admin/btor/${btor.id}`}
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          ← Detail BTOR
        </Link>
        <h1 className="mt-3 text-xl font-bold pa-hgrad">Edit BTOR</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {btor.petugas || `#${btor.idpetugas}`} · {btor.desa} · {btor.tanggal}
        </p>

        {sp?.created && (
          <SuccessPopup paramKey="created" title="Tersimpan">
            {btor.status === "draft"
              ? "Draf BTOR tersimpan — lengkapi dan kirim kapan saja."
              : "BTOR terkirim dan akan diperiksa oleh admin."}
          </SuccessPopup>
        )}
        {sp?.saved && (
          <SuccessPopup paramKey="saved" title="Tersimpan">
            Perubahan BTOR tersimpan.
          </SuccessPopup>
        )}
        {sp?.dikirim && (
          <SuccessPopup paramKey="dikirim" title="Terkirim">
            BTOR terkirim dan akan diperiksa oleh admin.
          </SuccessPopup>
        )}
        {sp?.error && (
          <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
            {String(sp.error)}
          </SuccessPopup>
        )}

        <div className="mt-5 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <BtorForm
            btor={btor}
            penugasan={penugasan}
            level={session.level ?? 1}
            petugasSaya={{ id: session.userId, nama: session.name }}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/20">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Hapus BTOR</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            BTOR, memo, dan riwayatnya dihapus permanen — order di dalamnya kembali jadi kandidat
            BTOR lain.
          </p>
          <form action={hapusBtor} className="mt-3">
            <input type="hidden" name="id" value={btor.id} />
            <ConfirmSubmit
              message={`Hapus BTOR "${btor.judul}"? Tindakan ini tidak bisa dibatalkan.`}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Hapus BTOR
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </main>
  );
}

