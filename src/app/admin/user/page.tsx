import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapMembers, type ApiMember } from "@/lib/api";
import { kirimPesan } from "@/lib/actions/member";
import UserTable from "@/components/admin/user-table";

export const metadata = { title: "Kelola User | Pohon Asuh" };

export default async function KelolaUserPage({
  searchParams,
}: PageProps<"/admin/user">) {
  const session = await requireAdminLevel();
  const sp = await searchParams;

  let members: ApiMember[] = [];
  let fetchError = false;
  try {
    members = mapMembers(await apiGet<Record<string, unknown>[]>("getmembers"));
  } catch {
    fetchError = true;
  }

  const kirimId = Number((Array.isArray(sp?.kirim) ? sp.kirim[0] : sp?.kirim) ?? NaN);
  const target = Number.isFinite(kirimId) ? members.find((m) => m.id === kirimId) : undefined;

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Kelola User</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Daftar seluruh akun terdaftar. Akun yang dinonaktifkan otomatis ditolak saat login di
        web maupun aplikasi mobile.
      </p>

      {sp?.updated && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
          {String(sp.updated)}
        </p>
      )}
      {sp?.error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {String(sp.error)}
        </p>
      )}

      {target && (
        <form
          action={kirimPesan}
          className="mt-6 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700"
        >
          <input type="hidden" name="idmember" value={target.id} />
          <input type="hidden" name="nama" value={target.name} />
          <h2 className="text-lg font-bold pa-hgrad">
            Kirim Pesan ke {target.name}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Pesan masuk ke lonceng notifikasi member (web & aplikasi mobile).
          </p>
          <label className="mt-4 block text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Isi pesan
            <textarea
              name="pesan"
              rows={3}
              required
              maxLength={300}
              placeholder="Tulis pesan untuk member ini…"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
            />
          </label>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Kirim Pesan
            </button>
            <Link
              href="/admin/user"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Batal
            </Link>
          </div>
        </form>
      )}

      {fetchError ? (
        <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          Gagal memuat daftar user. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : (
        <UserTable
          members={members}
          ownId={session.userId}
          initialQuery={(Array.isArray(sp?.q) ? sp.q[0] : sp?.q) ?? ""}
        />
      )}
    </main>
  );
}
