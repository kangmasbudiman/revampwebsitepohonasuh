import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";
import { editMitraProfil, gantiPasswordMitra } from "@/lib/actions/mitra";
import SuccessPopup from "@/components/admin/success-popup";

export const metadata = { title: "Pengaturan | Pohon Asuh" };

export default async function MitraPengaturanPage(props: PageProps<"/mitra/pengaturan">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let info: { mitra: { id: number; nama: string; alamat: string | null; nama_pj: string | null; email: string | null; hp: string | null; logo: string | null }; member: { id: number; name: string; emaile: string } } | null = null;
  try {
    const res = await apiPost<Record<string, unknown>>("mitramyinfo", { idmember: session.userId });
    if (Number(res.value) === 200) info = res as unknown as typeof info;
  } catch {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  if (!info) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const mitraInfo = info!;

  return (
    <main className="w-full px-6 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-emerald-950">Pengaturan</h1>
      <p className="mt-1 text-sm text-zinc-600">Mitra: <strong>{mitraInfo.mitra.nama}</strong></p>

      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">Profil lembaga diperbarui.</SuccessPopup>}
      {sp?.password && <SuccessPopup paramKey="password" title="Tersimpan">Password berhasil diubah.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="mt-8 space-y-6">
        {/* Profil Lembaga */}
        <section className="rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Profil Lembaga</h2>
          <form action={editMitraProfil} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nama Lembaga</label>
              <input defaultValue={mitraInfo.mitra.nama} readOnly className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-night-700 dark:bg-night-800 dark:text-zinc-400" />
              <p className="mt-1 text-[11px] text-zinc-400">Nama lembaga tidak dapat diubah dari portal mitra.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nama Penanggung Jawab</label>
              <input name="nama_pj" defaultValue={mitraInfo.mitra.nama_pj ?? mitraInfo.member.name} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Alamat</label>
              <textarea name="alamat" rows={2} defaultValue={mitraInfo.mitra.alamat ?? ""} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
              <input name="email" type="email" defaultValue={mitraInfo.mitra.email ?? mitraInfo.member.emaile} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nomor Kontak / HP</label>
              <input name="hp" type="tel" defaultValue={mitraInfo.mitra.hp ?? ""} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Logo Lembaga (opsional)</label>
              <input name="logo" type="file" accept="image/*" className="mt-1 w-full text-sm" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Perubahan</button>
            </div>
          </form>
        </section>

        {/* Akun */}
        <section className="rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Akun</h2>
          <form action={gantiPasswordMitra} className="mt-4 grid max-w-md gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password Lama</label>
              <input name="password_lama" type="password" required className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password Baru</label>
              <input name="password_baru" type="password" required minLength={6} pattern=".{6,}" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
              <p className="mt-1 text-[11px] text-zinc-400">Minimal 6 karakter.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Konfirmasi Password Baru</label>
              <input name="password_ulang" type="password" required minLength={6} pattern=".{6,}" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
            </div>
            <div>
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Ubah Password</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
