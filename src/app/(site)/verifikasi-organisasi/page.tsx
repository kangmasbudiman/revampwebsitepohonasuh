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
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Yang perlu Anda lakukan selanjutnya:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Periksa email <strong>{emailPj || ""}</strong> untuk mendapatkan kode OTP.</li>
            <li>Masukkan kode OTP di bawah dan klik <strong>Konfirmasi</strong>.</li>
            <li>Setelah berhasil, pendaftaran Anda masuk ke antrian verifikasi admin Pohon Asuh.</li>
            <li>Setelah disetujui, Anda akan menerima notifikasi dan dapat masuk ke <strong>Dashboard Mitra</strong>.</li>
          </ol>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {emailPj ? <>Kami telah mengirimkan <strong>kode OTP 6 digit</strong> ke <strong>{emailPj}</strong>. Masukkan kode di bawah untuk menuntaskan pendaftaran organisasi Anda.</> : <>Masukkan kode OTP 6 digit dari email admin yang tertera.</>}
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
