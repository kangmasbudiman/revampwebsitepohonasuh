export const metadata = { title: "Syarat & Ketentuan" };

const SECTIONS: { title: string; paras: string[] }[] = [
  {
    title: "1. Tentang Program Pohon Asuh",
    paras: [
      "Pohon Asuh adalah program adopsi pohon yang dikelola bersama masyarakat adat dan desa pengelola hutan di Provinsi Jambi, Indonesia. Melalui situs ini, donatur dapat memilih dan mengasuh pohon tertentu yang tumbuh di habitat aslinya.",
      "Adopsi pohon merupakan bentuk dukungan dana perawatan dan pelestarian pohon, bukan kepemilikan lahan, kayu, maupun hak pemanfaatan hutan. Pohon tetap tumbuh di dalam hutan desa dan dirawat oleh masyarakat pengelola.",
    ],
  },
  {
    title: "2. Akun Pengguna",
    paras: [
      "Anda wajib memberikan data yang benar saat mendaftar (nama, email, dan nomor HP aktif) dan bertanggung jawab menjaga kerahasiaan kata sandi akun Anda.",
      "Satu orang dianjurkan memiliki satu akun. Kami berhak menonaktifkan akun yang terbukti memberikan data palsu, melakukan penyalahgunaan, atau mengganggu kelancaran program.",
    ],
  },
  {
    title: "3. Pembayaran",
    paras: [
      "Dana adopsi dibayarkan penuh di muka sesuai harga pohon yang tertera (per tahun perawatan) melalui metode pembayaran yang disediakan, yaitu transfer bank atau gateway pembayaran resmi.",
      "Pesanan yang tidak dibayar dalam batas waktu yang ditentukan akan dibatalkan otomatis dan pohon dikembalikan menjadi tersedia untuk donatur lain.",
    ],
  },
  {
    title: "4. Verifikasi dan Sertifikat",
    paras: [
      "Setelah pembayaran diterima, tim admin memverifikasi bukti pembayaran Anda. Proses verifikasi bukan layanan instan dan dapat memakan waktu beberapa hari kerja.",
      "Donatur yang pesanannya terverifikasi menerima sertifikat adopsi bernomor unik yang dapat ditampilkan dan diverifikasi secara daring melalui situs ini. Sertifikat atas nama sesuai data pemesan dan dapat diisi pesan/kesan.",
    ],
  },
  {
    title: "5. Pembatalan dan Pengembalian Dana",
    paras: [
      "Pesanan yang belum diverifikasi dapat dibatalkan oleh donatur; dana yang telah masuk dapat dikembalikan setelah dipotong biaya administrasi yang berlaku.",
      "Pesanan yang telah terverifikasi dan diterbitkan sertifikatnya tidak dapat dibatalkan karena dana telah disalurkan untuk perawatan pohon dan kompensasi masyarakat pengelola hutan.",
    ],
  },
  {
    title: "6. Perubahan Konten Program",
    paras: [
      "Data pohon (foto, ukuran, status) merupakan hasil survei lapangan dan dapat diperbarui seiring pemantauan. Nomor sertifikat, tanggal adopsi, dan masa berlaku perawatan mengikuti data yang tercatat di sistem.",
      "Kami berupaya menjaga keakuratan informasi, namun tidak bertanggung jawab atas kerugian yang timbul dari kesalahan pengetikan data pihak donatur (misalnya nama pada sertifikat).",
    ],
  },
  {
    title: "7. Perubahan Syarat",
    paras: [
      "Kami dapat memperbarui Syarat & Ketentuan ini sewaktu-waktu. Versi terbaru berlaku sejak dipublikasikan di halaman ini. Penggunaan situs setelah perubahan dianggap sebagai persetujuan Anda.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">Syarat & Ketentuan</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Terakhir diperbarui: 26 September 2026 · Berlaku untuk seluruh pengguna situs Pohon Asuh
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
        Pertanyaan seputar syarat & ketentuan dapat disampaikan melalui halaman{" "}
        <a href="/kontak" className="font-semibold underline underline-offset-4">
          Kontak
        </a>
        .
      </p>
    </main>
  );
}
