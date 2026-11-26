import { requireUser } from "@/lib/guard";
import { apiPost, certUrl } from "@/lib/api";
import { namaDesa } from "@/lib/format";
import Link from "next/link";
import { Download } from "lucide-react";

export const metadata = { title: "Sertifikat Mitra | Pohon Asuh" };

type AdopsiRow = Record<string, unknown>;
type GroupedAdopsi = {
  key: string;
  idpohon: string[];
  nama: string;
  desa: string;
  tglAdopt: string;
  certnum: string;
};

export default async function MitraSertifikatPage() {
  const session = await requireUser();

  let adopsi: AdopsiRow[] = [];
  try {
    adopsi = await apiPost<AdopsiRow[]>("mitramyadopsi", { idmember: session.userId });
  } catch {
    adopsi = [];
  }

  // Satu sertifikat (certnum) bisa mencakup beberapa pohon milik pengadopsi
  // yang sama → digabung jadi satu baris, ID pohonnya dirangkum.
  const groups = new Map<string, GroupedAdopsi>();
  for (const r of adopsi) {
    const certnum = String(r.certnum ?? "").trim();
    const nama = String(r.nama ?? "—");
    const desa = String(r.desa ?? "");
    const tglAdopt = String(r.tgl_adopt ?? "—");
    const key = certnum || `belum:${nama}|${desa}|${tglAdopt}`;
    const idpohon = String(r.idpohon ?? "").trim();

    const g = groups.get(key) ?? { key, idpohon: [], nama, desa, tglAdopt, certnum };
    if (idpohon) g.idpohon.push(idpohon);
    groups.set(key, g);
  }
  const grouped = Array.from(groups.values());

  return (
    <main className="mx-auto w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950 dark:text-white">Sertifikat Mitra</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Daftar adopsi mitra Anda beserta sertifikat yang sudah terbit.
      </p>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm md:block dark:border-night-700">
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
            {grouped.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-3 align-top">
                  <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                    {r.idpohon.length ? r.idpohon.join(", ") : "—"}
                  </div>
                  {r.idpohon.length > 1 && (
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      {r.idpohon.length} pohon
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 align-top">{r.nama}</td>
                <td className="px-3 py-3 align-top text-zinc-500">{namaDesa(r.desa)}</td>
                <td className="px-3 py-3 align-top text-zinc-500">{r.tglAdopt}</td>
                <td className="px-3 py-3 align-top font-mono text-xs">{r.certnum || "—"}</td>
                <td className="px-3 py-3 text-right align-top">
                  {r.certnum ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={certUrl(r.certnum)}
                        target="_blank"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Lihat Sertifikat
                      </Link>
                      <a
                        href={`${certUrl(r.certnum)}?autoprint=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                        title="Cetak / simpan sebagai PDF"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden /> Download
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">Belum terbit</span>
                  )}
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Belum ada adopsi mitra.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tampilan kartu untuk layar kecil */}
      <div className="mt-4 space-y-3 md:hidden">
        {grouped.map((r) => (
          <div key={r.key} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm pa-card dark:border-night-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-all font-mono text-xs font-medium text-emerald-900 dark:text-emerald-300">
                {r.idpohon.length ? r.idpohon.join(", ") : "—"}
              </div>
              {r.idpohon.length > 1 && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {r.idpohon.length} pohon
                </span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {[
                ["Pengadopsi", r.nama],
                ["Lokasi", namaDesa(r.desa)],
                ["Tgl Adopt", r.tglAdopt],
                ["Certnum", r.certnum || "—"],
              ].map(([label, nilai]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</dt>
                  <dd className="mt-0.5 truncate font-medium text-zinc-800 dark:text-zinc-200" title={nilai}>{nilai}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.certnum ? (
                <>
                  <Link
                    href={certUrl(r.certnum)}
                    target="_blank"
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Lihat Sertifikat
                  </Link>
                  <a
                    href={`${certUrl(r.certnum)}?autoprint=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden /> Download
                  </a>
                </>
              ) : (
                <span className="text-xs text-zinc-400">Belum terbit</span>
              )}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-2xl border border-dashed border-emerald-200 p-8 text-center text-sm text-zinc-500 dark:border-night-700">
            Belum ada adopsi mitra.
          </div>
        )}
      </div>
    </main>
  );
}
