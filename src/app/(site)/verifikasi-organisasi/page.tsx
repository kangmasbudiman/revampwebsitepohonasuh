import Link from "next/link";
import { verifikasiOtpOrg } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Konfirmasi Pendaftaran | Pohon Asuh" };

export default async function VerifikasiOrganisasiPage(props: PageProps<"/verifikasi-organisasi">) {
  const sp = await props.searchParams;
  const idorga = Number(sp?.id) || 0;
  const emailPj = typeof sp?.email === "string" ? sp.email : "";
  const error = typeof sp?.error === "string" ? sp.error : "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm dark:border-night-700 dark:bg-night-900">
        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
          Konfirmasi Pendaftaran
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Masukkan kode OTP 6 digit yang telah dikirim ke email penanggung jawab
          {emailPj ? ` (${emailPj})` : ""}.
        </p>

        {error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{error}</SuccessPopup>}
        {sp?.terdaftar && <SuccessPopup paramKey="terdaftar" title="Berhasil">Pendaftaran terverifikasi!</SuccessPopup>}

        <form action={verifikasiOtpOrg} className="mt-6 space-y-4">
          <input type="hidden" name="idorga" value={idorga} />
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Kode OTP
          </label>
          <input
            name="code"
            type="text"
            placeholder="6 digit kode dari email"
            required
            pattern="[0-9]{6}"
            maxLength={6}
            inputMode="numeric"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Konfirmasi
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Tidak menerima kode?{" "}
          <Link href="/daftar-mitra" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Kembali ke pendaftaran
          </Link>
        </p>
      </div>
    </main>
  );
}
