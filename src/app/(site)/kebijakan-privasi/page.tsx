export const metadata = { title: "Kebijakan Privasi" };

const SECTIONS: { title: string; paras: string[] }[] = [
  {
    title: "1. Data yang Kami Kumpulkan",
    paras: [
      "Saat mendaftar dan mengadopsi pohon, kami mengumpulkan: nama lengkap, alamat email, nomor HP, dan alamat (opsional). Data ini digunakan untuk membuat akun, menerbitkan sertifikat adopsi, serta menghubungi Anda terkait pesanan.",
      "Untuk pesanan, kami juga menyimpan catatan transaksi: pohon yang diadopsi, nilai dana, bukti pembayaran, nomor invoice, dan status verifikasi.",
    ],
  },
  {
    title: "2. Penggunaan Data",
    paras: [
      "Data Anda digunakan untuk: memproses pesanan dan pembayaran, menerbitkan sertifikat adopsi bernomor unik, mengirim notifikasi status pesanan (misalnya verifikasi berhasil), serta keperluan pelaporan program.",
      "Nama Anda dapat ditampilkan pada sertifikat adopsi sesuai data yang Anda isi sendiri. Kami tidak menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak ketiga.",
    ],
  },
  {
    title: "3. Notifikasi",
    paras: [
      "Pengguna aplikasi mobile Pohon Asuh dapat menerima notifikasi push (seperti status verifikasi pembayaran) melalui perangkat masing-masing. Notifikasi dapat dinonaktifkan kapan saja dari pengaturan perangkat Anda.",
    ],
  },
  {
    title: "4. Cookie dan Sesi",
    paras: [
      "Situs ini hanya menggunakan cookie sesi login (pa_session) agar Anda tetap masuk saat berpindah halaman. Kami tidak menggunakan cookie pelacakan pihak ketiga untuk iklan.",
    ],
  },
  {
    title: "5. Penyimpanan dan Keamanan",
    paras: [
      "Data disimpan di server program dan dijaga sesuai praktik keamanan yang wajar. Akses ke data terbatas pada pengelola program yang berkepentingan (verifikasi pesanan dan penerbitan sertifikat).",
    ],
  },
  {
    title: "6. Hak Anda",
    paras: [
      "Anda berhak meminta akses, koreksi, atau penghapusan data pribadi Anda dengan menghubungi kami melalui halaman Kontak. Permintaan akan kami proses selama tidak bertentangan dengan kewajiban pencatatan transaksi program.",
    ],
  },
  {
    title: "7. Perubahan Kebijakan",
    paras: [
      "Kebijakan privasi ini dapat diperbarui sewaktu-waktu; versi terbaru berlaku sejak dipublikasikan di halaman ini.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">Kebijakan Privasi</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Terakhir diperbarui: 26 September 2026 · Bagaimana Pohon Asuh mengelola data Anda
      </p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-emerald-900">{s.title}</h2>
            {s.paras.map((p, i) => (
              <p key={i} className="mt-2 leading-7 text-zinc-600">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm leading-6 text-emerald-900">
        Ada pertanyaan tentang data pribadi Anda? Sampaikan melalui halaman{" "}
        <a href="/kontak" className="font-semibold underline underline-offset-4">
          Kontak
        </a>
        .
      </p>
    </main>
  );
}
