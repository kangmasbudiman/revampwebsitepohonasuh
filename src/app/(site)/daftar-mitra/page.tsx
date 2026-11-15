import Link from "next/link";
import { daftarMitra } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Daftar Mitra | Pohon Asuh" };

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

export default async function DaftarMitraPage(props: PageProps<"/daftar-mitra">) {
  const sp = await props.searchParams;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-14">
      <div className="w-full rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm dark:border-night-700 dark:bg-night-900">
        <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
          Daftar Sebagai Mitra
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Isi identitas lembaga Anda. Setelah dikirim, admin KKI Warsi akan
          memeriksa dan mengaktifkan akun mitra.
        </p>

        {sp?.error && (
          <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">
            {String(sp.error)}
          </SuccessPopup>
        )}

        <form action={daftarMitra} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nama Lembaga <span className="text-red-500">*</span>
            </label>
            <input name="nama" required placeholder="mis. Jejakin Indonesia" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nama Penanggung Jawab (PIC)
            </label>
            <input name="nama_pj" placeholder="mis. Budi Santoso" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Alamat
            </label>
            <textarea name="alamat" rows={2} placeholder="Alamat lengkap lembaga" className={inputClass} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="email" type="email" required placeholder="lembaga@contoh.org" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nomor Kontak / HP
              </label>
              <input name="hp" type="tel" placeholder="08xxxxxxxxxx" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              pattern=".{6,}"
              title="Minimal 6 karakter"
              placeholder="Minimal 6 karakter"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Kirim Pendaftaran
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Masuk di sini →
          </Link>
        </p>
      </div>
    </main>
  );
}
