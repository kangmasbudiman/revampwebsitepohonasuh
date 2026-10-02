import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const faqs = [
    {
      question: "Apa itu program Pohon Asuh?",
      answer:
        "Pohon Asuh adalah program adopsi pohon di hutan adat dan hutan desa yang dikelola masyarakat. Dengan mengadopsi pohon, Anda memberikan kompensasi kepada masyarakat lokal agar pohon tetap dirawat dan tidak ditebang, sehingga hutan beserta keanekaragaman hayatinya tetap terjaga.",
      sortOrder: 1,
    },
    {
      question: "Bagaimana cara mengadopsi pohon?",
      answer:
        "Buat akun, pilih pohon yang tersedia di halaman Data Pohon, lalu klik Adopsi. Anda akan menerima instruksi transfer beserta kode unik. Setelah pembayaran terverifikasi, sertifikat adopsi digital akan diterbitkan atas nama Anda.",
      sortOrder: 2,
    },
    {
      question: "Berapa biaya adopsi sebuah pohon?",
      answer:
        "Biaya adopsi bervariasi tergantung ukuran dan jenis pohon. Dana ini digunakan untuk biaya perawatan, patroli, dan kompensasi pengelolaan oleh masyarakat lokal.",
      sortOrder: 3,
    },
    {
      question: "Apakah pohon menjadi milik saya?",
      answer:
        "Tidak. Pohon tetap berada dan tumbuh di habitat aslinya serta menjadi milik masyarakat pengelola hutan. Anda menjadi pengasuh (caregiver) pohon tersebut dan berhak atas sertifikat adopsi serta laporan perkembangan program.",
      sortOrder: 4,
    },
    {
      question: "Apa yang saya dapatkan setelah mengadopsi?",
      answer:
        "Anda mendapatkan sertifikat adopsi digital bernomor unik yang dapat diverifikasi secara daring, namanya tercatat pada data pohon, serta berkontribusi langsung dalam transparansi penggunaan dana melalui laporan keuangan yang dipublikasikan.",
      sortOrder: 5,
    },
    {
      question: "Bagaimana dana adopsi digunakan?",
      answer:
        "Dana digunakan untuk kompensasi masyarakat pengasuh pohon, biaya operasional kelompok pengelola hutan (patroli, pemetaan, perawatan), dan program peningkatan ekonomi masyarakat lokal. Laporan pemasukan dan pengeluaran dapat dilihat pada menu Keuangan.",
      sortOrder: 6,
    },
    {
      question: "Apakah saya dapat mengunjungi pohon saya?",
      answer:
        "Ya, Anda dapat mengunjungi lokasi hutan bersama kelompok pengelola dengan perjanjian terlebih dahulu. Hubungi kami melalui halaman Kontak untuk menjadwalkan kunjungan.",
      sortOrder: 7,
    },
    {
      question: "Berapa lama masa berlaku adopsi?",
      answer:
        "Satu paket adopsi berlaku selama satu tahun dan dapat diperpanjang. Sebelum masa adopsi berakhir, kami akan menghubungi Anda melalui email untuk informasi perpanjangan.",
      sortOrder: 8,
    },
  ];

  for (const f of faqs) {
    const exists = await db.faq.findFirst({ where: { question: f.question } });
    if (!exists) await db.faq.create({ data: f });
  }

  const expenseCount = await db.expense.count();
  if (expenseCount === 0) {
    const expenses = [
      {
        title: "Kompensasi pengasuh pohon triwulan 1",
        description: "Penyaluran kompensasi kepada masyarakat pengelola hutan adat Rantau Kremas",
        category: "Kompensasi Masyarakat",
        amountIdr: 12500000,
        spentAt: new Date("2026-04-10"),
      },
      {
        title: "Patroli dan pemetaan hutan",
        description: "Biaya patroli kawasan serta pembaruan peta titik pohon di empat lokasi",
        category: "Operasional Hutan",
        amountIdr: 4800000,
        spentAt: new Date("2026-05-18"),
      },
      {
        title: "Perawatan bibit dan pohon muda",
        description: "Pembelian pupuk dan alat perawatan di lokasi Long Lake",
        category: "Perawatan",
        amountIdr: 3200000,
        spentAt: new Date("2026-06-22"),
      },
      {
        title: "Pelatihan ekonomi kreatif masyarakat",
        description: "Workshop pengolahan hasil hutan bukan kayu untuk ibu-ibu di Sinarwajo",
        category: "Pemberdayaan Masyarakat",
        amountIdr: 5600000,
        spentAt: new Date("2026-07-30"),
      },
      {
        title: "Publikasi dan komunikasi program",
        description: "Produksi konten laporan perkembangan program untuk donatur",
        category: "Komunikasi",
        amountIdr: 1750000,
        spentAt: new Date("2026-08-15"),
      },
    ];
    for (const e of expenses) {
      await db.expense.create({ data: e });
    }
  }

  const settings = [
    { key: "site.tagline", value: "Adopt Trees, Save The World" },
    { key: "site.description", value: "Program adopsi pohon untuk melindungi hutan adat dan hutan desa bersama masyarakat lokal di Indonesia." },
    { key: "contact.whatsapp", value: "+628117453700" },
    { key: "contact.email", value: "pohonasuh@warsi.or.id" },
    { key: "contact.address", value: "Jl. S. Parman No. 38, Sungai Binjai, Jambi 36124" },
    { key: "contact.instagram", value: "https://www.instagram.com/pohonasuh/" },
    { key: "contact.facebook", value: "https://www.facebook.com/pohonasuh/" },
    { key: "contact.youtube", value: "https://www.youtube.com/user/kkiwarsi" },
  ];
  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log("Seed selesai.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
