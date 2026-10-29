import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import KirimUlangVerifikasi from "@/components/kirim-ulang-verifikasi";

export async function generateMetadata() {
  return { title: (await getDict()).pages.verifikasi.title };
}

// Tujuan klik tautan verifikasi dari email. Verifikasi langsung dijalankan
// server-side (GET verifikasiemail) lalu hasilnya dirender — token tidak
// pernah sampai ke JS klien.
export default async function VerifikasiPage(props: PageProps<"/verifikasi">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const t = (await getDict()).pages.verifikasi;

  let sukses = false;
  let pesan = t.loadError;
  if (token) {
    try {
      const res = await apiGet<{ value?: string | number; pesan?: string }>(
        `verifikasiemail?token=${encodeURIComponent(token)}`,
      );
      sukses = String(res.value) === "1";
      pesan = res.pesan ?? pesan;
    } catch {
      // pesan default loadError
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        {sukses ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-emerald-950">{t.successTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{t.successDesc}</p>
            <Link
              href="/masuk"
              className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t.toLogin}
            </Link>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-14 w-14 text-red-500" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-emerald-950">{t.failTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{pesan}</p>
            <div className="mt-6 text-left">
              <p className="text-sm font-semibold text-zinc-700">{t.resendTitle}</p>
              <p className="mb-1 mt-0.5 text-xs text-zinc-500">{t.resendDesc}</p>
              <KirimUlangVerifikasi
                labels={{ resend: t.resend, resending: t.resending }}
              />
            </div>
            <p className="mt-5 text-sm">
              <Link
                href="/masuk"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {t.toLogin}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
