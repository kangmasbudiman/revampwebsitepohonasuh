import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet, mapMitra, type ApiMitra } from "@/lib/api";
import { tambahMitra, editMitra, hapusMitra, uploadTaggingMitra, setMemberMitra, buatAkunMitra } from "@/lib/actions/mitra";
import ConfirmSubmit from "@/components/admin/confirm-submit";

export const metadata = { title: "Mitra Adopsi | Pohon Asuh" };

export default async function AdminMitraPage(props: PageProps<"/admin/mitra">) {
  await requireAdminLevel();
  const sp = await props.searchParams;

  let mitra: ApiMitra[] = [];
  let fetchError = false;
  try {
    mitra = (await apiGet<Record<string, unknown>[]>("mitralist")).map(mapMitra);
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-bold pa-hgrad">Mitra Adopsi</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Kelola mitra (mis. Jejakin) yang memesan pohon untuk ditawarkan ke
        pengadopsi jaringannya. Mitra dapat ditambah kapan saja. Upload desain
        papan taging khusus per mitra (opsional).
      </p>

      {sp?.created && <SuccessPopup paramKey="created" title="Ditambahkan">Mitra ditambahkan.</SuccessPopup>}
      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">Perubahan mitra tersimpan.</SuccessPopup>}
      {sp?.deleted && <SuccessPopup paramKey="deleted" title="Terhapus">Mitra dihapus.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}
      {sp?.akun === "1" && <SuccessPopup paramKey="akun" title="Akun Mitra Dibuat">Email: {String(sp.email)} — Password: {String(sp.pass)}. Bagikan ke mitra.</SuccessPopup>}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">+ Tambah Mitra Baru</summary>
        <form action={tambahMitra} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="nama" placeholder="Nama mitra (mis. Jejakin)" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="slug" placeholder="slug (opsional, auto)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <select name="aktif" defaultValue="1" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
          <button type="submit" className="sm:col-span-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Simpan Mitra</button>
        </form>
      </details>

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Gagal memuat data mitra.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
          <table className="w-full text-left text-sm">
            <thead className="pa-thead border-b border-emerald-100 dark:border-night-700">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Akun Login</th>
              <th className="px-4 py-3 font-semibold">Desain Tagging</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
              {mitra.map((m) => (
                <tr key={m.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                  <td className="px-4 py-3 font-mono text-xs">{m.id}</td>
                  <td className="px-4 py-3 font-medium">{m.nama}</td>
                  <td className="px-4 py-3 text-zinc-500">{m.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.aktif ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {m.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.akun ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" title={m.akun.emaile}>
                        ✓ {m.akun.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:bg-night-700 dark:text-zinc-400">
                        ✗ Belum ada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.taggingTemplate ? (
                      <span className="text-xs text-teal-700 dark:text-teal-300">{m.taggingTemplate}</span>
                    ) : (
                      <span className="text-xs text-zinc-400">standar</span>
                    )}
                    <form action={uploadTaggingMitra} className="mt-1 flex items-center gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="file" name="file" accept="image/*" className="text-xs" />
                      <button type="submit" className="rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-900 dark:text-teal-300">Upload</button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={editMitra} className="inline">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="nama" value={m.nama} />
                      <input type="hidden" name="slug" value={m.slug} />
                      <input type="hidden" name="aktif" value={m.aktif ? "0" : "1"} />
                      <button type="submit" className="mr-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300">
                        {m.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </form>
                    <form action={hapusMitra} className="inline">
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmSubmit
                        message={`Hapus mitra ${m.nama}? Tidak bisa jika masih ada pohon/adopsi terkait.`}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {mitra.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Belum ada mitra. Tambahkan di atas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">Tautkan Akun Member ke Mitra</summary>
        <form action={setMemberMitra} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="idmember" type="number" placeholder="ID akun member" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <select name="mitra_id" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value="0">Lepas tautan (non-mitra)</option>
            {mitra.map((m) => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Tautkan</button>
        </form>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Akun member dengan role Mitra akan terikat ke mitra terpilih dan bisa login ke portal mitra.</p>
      </details>
          <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-emerald-800">Buat Akun Login Mitra</summary>
        <form action={buatAkunMitra} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select name="mitra_id" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100">
            <option value="">Pilih mitra…</option>
            {mitra.map((m) => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
          <input name="name" placeholder="Nama akun" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="email" type="email" placeholder="Email login" required className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="password" type="password" placeholder="Password (min 6)" required minLength={6} pattern=".{6,}" title="Minimal 6 karakter" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <input name="hp" placeholder="No HP (opsional)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-night-700 dark:bg-night-950 dark:text-zinc-100" />
          <button type="submit" className="sm:col-span-2 lg:col-span-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Buat Akun</button>
        </form>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Akun otomatis terhubung ke mitra & role Mitra. Bagikan email+password ke mitra.</p>
      </details>
</main>
  );
}
