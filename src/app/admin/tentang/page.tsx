import { requireAdminLevel } from "@/lib/guard";
import { getTentangKonten, type ApiTentang } from "@/lib/api";
import TentangForm from "@/components/admin/tentang-form";

export const metadata = { title: "Tentang Pohon Asuh | Admin Pohon Asuh" };

export default async function AdminTentangPage() {
  await requireAdminLevel();

  let tentang: ApiTentang = { judul: null, deskripsi: null, mekanisme: null, langkah: [] };
  try {
    tentang = await getTentangKonten();
  } catch {
    // biarkan kosong — form bisa mengisi awal
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Tentang Pohon Asuh</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Konten halaman publik /tentang — perubahan langsung tampil setelah disimpan.
      </p>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <TentangForm tentang={tentang} />
      </div>
    </main>
  );
}
