import Image from "next/image";
import Link from "next/link";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapPosts, type ApiPost } from "@/lib/api";
import BlogForm from "@/components/admin/blog-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { deleteBlog } from "@/lib/actions/blog";

export const metadata = { title: "Kelola Blog | Pohon Asuh" };

export default async function AdminBlogPage({
  searchParams,
}: PageProps<"/admin/blog">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let posts: ApiPost[] = [];
  let fetchError = false;
  try {
    posts = mapPosts(await apiGet<Record<string, unknown>[]>("blog")).sort((a, b) => b.id - a.id);
  } catch {
    fetchError = true;
  }

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold pa-hgrad">Kelola Blog</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {posts.length} artikel — tampil di halaman Blog publik & homepage.
          </p>
        </div>
      </div>

      {sp?.saved && <Banner tone="ok">Perubahan artikel tersimpan.</Banner>}
      {sp?.deleted && <Banner tone="ok">Artikel dihapus.</Banner>}
      {sp?.error && <Banner tone="err">{String(sp.error)}</Banner>}

      <details className="mt-6 rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-700">
          ＋ Tambah Artikel
        </summary>
        <div className="mt-4 border-t border-emerald-50 pt-4 dark:border-night-800">
          <BlogForm />
        </div>
      </details>

      {fetchError && (
        <p className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Gagal memuat data artikel. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-100 dark:border-night-700 pa-card shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 dark:border-night-700 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Cover</th>
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Penulis</th>
              <th className="px-4 py-3 text-right">Dibaca</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-emerald-50/40 dark:hover:bg-night-800/50">
                <td className="px-4 py-3">
                  {post.coverUrl ? (
                    <Image
                      src={post.coverUrl}
                      alt={post.title}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-2xl">📰</span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <Link
                    href={`/blog/${post.id}`}
                    className="line-clamp-1 font-medium text-emerald-900 dark:text-emerald-100 hover:underline"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 dark:bg-night-800 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {post.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{post.author}</td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">{post.viewer}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="rounded-lg border border-emerald-200 dark:border-night-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-night-800"
                    >
                      Edit
                    </Link>
                    <form action={deleteBlog}>
                      <input type="hidden" name="id" value={post.id} />
                      <ConfirmSubmit
                        message={`Hapus artikel "${post.title}"? Tindakan ini tidak bisa dibatalkan.`}
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
                      >
                        Hapus
                      </ConfirmSubmit>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && !fetchError && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Belum ada artikel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Banner({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-sm ${
        tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600 dark:text-red-400"
      }`}
    >
      {children}
    </p>
  );
}
