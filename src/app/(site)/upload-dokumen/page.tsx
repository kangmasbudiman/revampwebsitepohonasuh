import Link from "next/link";
import { CheckCircle2, ArrowRight, TriangleAlert, TreePine } from "lucide-react";
import UploadDokumenForm from "@/components/upload-dokumen-form";

export const metadata = { title: "Upload Dokumen Pendukung | Pohon Asuh" };

type CekResult = {
  value?: string | number;
  pesan?: string;
  data?: {
    nama?: string;
    jenis?: string;
    email_pj?: string;
    has_profil?: boolean;
    has_legal?: boolean;
    has_surat?: boolean;
  };
};

async function cekToken(token: string): Promise<CekResult> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/cektokendokumen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    return (await res.json()) as CekResult;
  } catch {
    return { value: "0", pesan: "Gagal menghubungi server. Coba lagi beberapa saat." };
  }
}

export default async function UploadDokumenPage(props: PageProps<"/upload-dokumen">) {
  const sp = await props.searchParams;
  const token = typeof sp?.token === "string" ? sp.token : "";
  const selesai = String(sp?.selesai ?? "") === "1";
  const error = typeof sp?.error === "string" ? sp.error : "";

  if (selesai) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-16">
        <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl dark:border-night-700 dark:bg-night-900">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-emerald-950">Dokumen Berhasil Dikirim</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Terima kasih — dokumen Anda sudah kami terima. Tim admin Pohon Asuh akan segera memverifikasi pendaftaran organisasi Anda.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            Kembali ke Beranda
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </main>
    );
  }

  const info = token ? await cekToken(token) : null;
  const data = info?.data;
  const valid = !!info && Number(info.value) === 1 && !!data;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
        <TreePine className="h-4 w-4" aria-hidden />Pohon Asuh — Mitra
      </p>
      <h1 className="mt-3 text-3xl font-extrabold text-emerald-950 dark:text-emerald-100">Upload Dokumen Pendukung</h1>

      {!valid ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <TriangleAlert className="mx-auto h-10 w-10 text-red-500" aria-hidden />
          <h2 className="mt-3 text-lg font-bold text-red-800">Link Tidak Valid</h2>
          <p className="mt-1 text-sm text-red-700">{info?.pesan ?? "Tautan upload tidak valid, sudah dipakai, atau sudah kedaluwarsa."}</p>
          <p className="mt-4 text-xs text-zinc-500">
            Minta tautan baru kepada admin Pohon Asuh, atau hubungi{" "}
            <a href="mailto:pohonasuh@warsi.or.id" className="font-semibold text-emerald-700 underline">pohonasuh@warsi.or.id</a>.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4 text-sm shadow-sm dark:border-night-700 dark:bg-night-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Pendaftaran atas nama</p>
            <p className="mt-1 text-base font-bold text-emerald-950 dark:text-emerald-100">{data.nama}</p>
            <p className="text-xs text-zinc-500">{data.jenis} · dikirim ke {data.email_pj}</p>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <UploadDokumenForm token={token} hasProfil={!!data.has_profil} hasLegal={!!data.has_legal} hasSurat={!!data.has_surat} />
        </>
      )}
    </main>
  );
}
