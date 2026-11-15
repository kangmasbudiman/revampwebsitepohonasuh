import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import Link from "next/link";
import { certUrl } from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";

export const metadata = { title: "Sertifikat Mitra | Pohon Asuh" };

export default async function MitraSertifikatPage() {
  const session = await requireUser();

  let adopsi: Record<string, unknown>[] = [];
  try {
    adopsi = await apiPost<Record<string, unknown>[]>("mitramyadopsi", { idmember: session.userId });
  } catch {
    adopsi = [];
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-emerald-950">Sertifikat Mitra</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Daftar adopsi mitra Anda beserta sertifikat yang sudah terbit.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
            <tr>
              <th className="px-3 py-3 font-semibold">ID Pohon</th>
              <th className="px-3 py-3 font-semibold">Pengadopsi</th>
              <th className="px-3 py-3 font-semibold">Lokasi</th>
              <th className="px-3 py-3 font-semibold">Tgl Adopt</th>
              <th className="px-3 py-3 font-semibold">Certnum</th>
              <th className="px-3 py-3 text-right font-semibold">Sertifikat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {adopsi.map((r) => (
              <tr key={Number(r.id)}>
                <td className="px-3 py-3 font-mono text-xs">{String(r.idpohon ?? "")}</td>
                <td className="px-3 py-3">{String(r.nama ?? "—")}</td>
                <td className="px-3 py-3 text-zinc-500">{namaDesa(String(r.desa ?? ""))}</td>
                <td className="px-3 py-3 text-zinc-500">{String(r.tgl_adopt ?? "—")}</td>
                <td className="px-3 py-3 font-mono text-xs">{String(r.certnum ?? "—")}</td>
                <td className="px-3 py-3 text-right">
                  {r.certnum ? (
                    <Link href={certUrl(String(r.certnum))} target="_blank" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      Lihat Sertifikat
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-400">Belum terbit</span>
                  )}
                </td>
              </tr>
            ))}
            {adopsi.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Belum ada adopsi mitra.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
