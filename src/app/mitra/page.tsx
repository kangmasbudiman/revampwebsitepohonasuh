import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import Link from "next/link";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Portal Mitra | Pohon Asuh" };

export default async function MitraDashboardPage(props: PageProps<"/mitra">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let info: { mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null }; member: { id: number; name: string; emaile: string } } | null = null;
  try {
    const res = await apiPost<any>("mitramyinfo", { idmember: session.userId });
    if (Number(res.value) === 200) info = res;
  } catch {
    // bukan mitra
  }
  if (!info) {
    // bukan akun mitra → kembali ke dashboard biasa
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">Portal Mitra</h1>
      <p className="mt-1 text-zinc-600">
        Halo, {info!.member.name} — mitra: <strong>{info!.mitra.nama}</strong>
      </p>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Berhasil">Request hold terkirim, menunggu approval admin.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/mitra/pohon" className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-zinc-500">Request Hold Pohon</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">Pesan pohon baru</p>
        </Link>
        <Link href="/mitra/adopsi" className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-zinc-500">Input Adopsi Mitra</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">Catat adopsi</p>
        </Link>
        <Link href="/mitra/sertifikat" className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-zinc-500">Sertifikat</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">Lihat sertifikat</p>
        </Link>
        <Link href="/dashboard" className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm hover:shadow-md">
          <p className="text-sm text-zinc-500">Dashboard Saya</p>
          <p className="mt-2 text-lg font-bold text-emerald-700">Adopsi pribadi</p>
        </Link>
      </div>
    </main>
  );
}
