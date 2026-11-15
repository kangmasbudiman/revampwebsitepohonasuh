import Link from "next/link";
import { daftarMitra } from "@/lib/actions/mitra";
import Image from "next/image";

export const metadata = { title: "Daftar Mitra | Pohon Asuh" };

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100";

export default async function DaftarMitraPage(props: PageProps<"/daftar-mitra">) {
  const sp = await props.searchParams;

  return (
    <main className="w-full">
      {/* Hero */}
      <section className="bg-emerald-900 px-6 py-16 text-zinc-100 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Program KKI Warsi & Mitra
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-5xl">
              Bergabung sebagai<br />Mitra Pohon Asuh
            </h1>
            <p className="mt-4 max-w-md text-base text-emerald-200">
              Lembaga Anda dapat memesan sejumlah pohon, menawarkannya kepada pengadopsi,
              menginput data pengadopsi, dan menerbitkan sertifikat — semua dalam satu sistem.
            </p>
            <Link href="#form-daftar" className="mt-6 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-400">
              Daftar Sekarang →
            </Link>
          </div>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl shadow-2xl">
            <Image src="/images/hero-1.jpg" alt="Hutan dengan pohon yang diadopsi" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section className="px-6 py-14 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Cara Kerja</p>
          <h2 className="mt-1 text-2xl font-bold text-emerald-950 sm:text-3xl">4 langkah sederhana</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Daftar", desc: "Lembaga Anda mendaftar lewat formulir di bawah." },
              { n: "02", title: "Aktivasi Admin", desc: "Admin KKI Warsi memeriksa identitas lembaga dan mengaktifkan akun mitra." },
              { n: "03", title: "Buat Program", desc: "Mitra membuat program, mengajukan pemesanan pohon, lalu admin menyetujui dan mengalokasikan pohon." },
              { n: "04", title: "Tawarkan & Adopsi", desc: "Mitra memasukkan data pengadopsi; sertifikat & tagging terbit otomatis setelah diverifikasi admin." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-emerald-500">{s.n}</p>
                <p className="mt-2 font-semibold text-emerald-950">{s.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefit */}
      <section className="bg-emerald-50 px-6 py-14 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Manfaat & Benefit</p>
          <h2 className="mt-1 text-2xl font-bold text-emerald-950 sm:text-3xl">Layanan untuk lembaga Anda</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Pemesanan pohon dari desa-desa di Sumatra",
              "Papan tagging desain khusus sesuai program Anda",
              "Sertifikat digital untuk setiap pohon teradopsi",
              "Dashboard mitra: kelola program, pesanan, adopsi, laporan",
              "Rekap & ekspor data adopsi per program/periode",
              "Pendampingan tim KKI Warsi",
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">✓</span>
                <span className="text-sm text-zinc-800">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="form-daftar" className="px-6 py-16 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Formulir Pendaftaran</p>
            <h2 className="mt-1 text-2xl font-bold text-emerald-950">Daftar sebagai mitra sekarang</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Isi data lembaga. Setelah dikirim, tim KKI Warsi akan memeriksa identitas
              lembaga Anda dan mengaktifkan akun mitra. Anda akan menerima email/notifikasi
              sebelum bisa login.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-700">
              <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Nama lembaga yang benar & resmi</li>
              <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Email admin/PIC yang aktif</li>
              <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Nomor kontak lembaga (HP/WhatsApp)</li>
            </ul>
            <p className="mt-8 text-xs text-zinc-500">
              Sudah punya akun mitra?{" "}
              <Link href="/masuk" className="font-semibold text-emerald-700 hover:underline">Masuk di sini</Link>
            </p>
          </div>

          <div className="lg:col-span-3">
            <form action={daftarMitra} className="rounded-3xl border border-emerald-100 bg-white p-7 shadow-lg dark:border-night-700 dark:bg-night-900">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Nama Lembaga <span className="text-red-500">*</span>
                  </label>
                  <input name="nama" required placeholder="mis. Jejakin Indonesia" className={inputClass} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Nama Penanggung Jawab (PIC)
                  </label>
                  <input name="nama_pj" placeholder="mis. Budi Santoso" className={inputClass} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Alamat</label>
                  <textarea name="alamat" rows={2} placeholder="Alamat lengkap lembaga" className={inputClass} />
                </div>

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

                <div className="sm:col-span-2">
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
                  <p className="mt-1 text-[11px] text-zinc-400">Minimal 6 karakter. Jangan bagikan ke siapapun.</p>
                </div>
              </div>

              {sp?.error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {String(sp.error)}
                </div>
              )}

              <button type="submit" className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                Kirim Pendaftaran
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
