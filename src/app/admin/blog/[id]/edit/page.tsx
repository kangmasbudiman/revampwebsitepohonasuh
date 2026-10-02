import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLevel } from "@/lib/guard";
import { apiGet, mapPost } from "@/lib/api";
import BlogForm from "@/components/admin/blog-form";

export const metadata = { title: "Edit Artikel | Pohon Asuh" };

export default async function EditBlogPage(props: PageProps<"/admin/blog/[id]/edit">) {
  await requireAdminLevel();
  const { id } = await props.params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  let post = null;
  try {
    const row = await apiGet<Record<string, unknown>>(`blogbyid?id=${postId}`);
    post = row ? mapPost(row) : null;
  } catch {
    post = null;
  }
  if (!post) notFound();

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/blog" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Kelola Blog
      </Link>
      <h1 className="mt-3 text-xl font-bold pa-hgrad">Edit Artikel</h1>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <BlogForm post={post} />
      </div>
    </main>
  );
}
