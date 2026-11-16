import Link from "next/link";
import { CheckCircle2, Clock3, ArrowRight } from "lucide-react";
import SumberInfoForm from "@/components/sumber-info-form";

export const metadata = { title: "Pendaftaran Diterima | Pohon Asuh" };

export default async function PendaftaranBerhasilPage(props: PageProps<"/pendaftaran-berhasil">) {
  const sp = await props.searchParams;
  const sumber = typeof sp?.sumber === "string" ? sp.sumber : "";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-14">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl dark:border-night-700 dark:bg-night-900">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-emerald-950 dark:text-emerald-100">
          {sumber ? "Terima Kasih!" : "Pendaftaran Anda Diterima"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {sumber
            ? "Pendaftaran organisasi Anda sudah kami terima. Sebelum masuk, jawab satu pertanyaan singkat ini:"
            : "Terima kasih — kami telah menerima pendaftaran organisasi Anda."}
        </p>

        {sumber ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-left">
            <SumberInfoForm token={sumber} />
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-semibold">Yang perlu Anda ketahui:</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>Anda akan menerima <strong>notifikasi email</strong> dari Pohon Asuh segera setelah admin memeriksa pendaftaran Anda.</li>
                <li>Admin akan memverifikasi dokumen organisasi dan penanggung jawab Anda.</li>
                <li>Setelah disetujui, akun Anda dapat langsung digunakan untuk masuk ke <strong>Dashboard Mitra</strong> dan mulai membuat program adopsi.</li>
                <li>Jika terdapat kekurangan, admin akan mengirim notifikasi untuk memperbaiki data Anda.</li>
              </ol>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
                <Clock3 className="h-4 w-4" aria-hidden />
                Proses verifikasi biasanya 1–3 hari kerja
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pastikan email Anda aktif — notifikasi akan dikirim ke <strong>email penanggung jawab</strong> yang terdaftar.
              </p>
            </div>

            <Link
              href="/masuk"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Masuk Pohon Asuh
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </>
        )}

        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          Butuh bantuan? Hubungi <a href="mailto:pohonasuh@warsi.or.id" className="font-semibold text-emerald-700 underline">pohonasuh@warsi.or.id</a>
        </p>
      </div>
    </main>
  );
}
