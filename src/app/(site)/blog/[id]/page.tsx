import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, User } from "lucide-react";
import { apiGet, apiPost, mapPost, mapPosts, type ApiPost } from "@/lib/api";
import { tanggal } from "@/lib/format";
import PostCard from "@/components/post-card";

type Props = PageProps<"/blog/[id]">;

async function getPost(id: number): Promise<ApiPost | null> {
  try {
    const row = await apiGet<Record<string, unknown>>(`blogbyid?id=${id}`);
    return row ? mapPost(row) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: Props) {
  const { id } = await props.params;
  const post = await getPost(Number(id));
  return { title: post ? `${post.title} — Blog Pohon Asuh` : "Artikel tidak ditemukan" };
}

export default async function BlogDetailPage(props: Props) {
  const { id } = await props.params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  const post = await getPost(postId);
  if (!post) notFound();

  // Naikkan pembaca (endpoint ini tak pernah dipanggil mobile — viewer
  // baru benar-benar terhitung dari web). Best-effort: kegagalan tak
  // boleh memblokir halaman.
  let viewer = post.viewer;
  try {
    await apiPost("addviewer", { id: postId });
    viewer += 1;
  } catch {
    // biarkan nilai lama
  }

  let others: ApiPost[] = [];
  try {
    others = mapPosts(await apiGet<Record<string, unknown>[]>("blog"))
      .sort((a, b) => b.id - a.id)
      .filter((p) => p.id !== postId)
      .slice(0, 3);
  } catch {
    // section opsional
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/blog" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Semua Artikel
      </Link>

      <article className="mt-4">
        <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-emerald-50 sm:h-80">
          {post.coverUrl ? (
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">📰</div>
          )}
        </div>

        <span className="mt-6 inline-block rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          {post.category}
        </span>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-emerald-950 sm:text-3xl">
          {post.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
            <User className="h-4 w-4" />
            {post.author}
          </span>
          {post.createdAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {tanggal(post.createdAt)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {viewer} kali dibaca
          </span>
        </div>

        <p className="mt-6 whitespace-pre-line text-justify leading-relaxed text-zinc-700">
          {post.description}
        </p>
      </article>

      {others.length > 0 && (
        <section className="mt-12 border-t border-emerald-100 pt-8">
          <h2 className="text-lg font-bold text-emerald-950">Artikel Lainnya</h2>
          <div className="mt-4 grid gap-4">
            {others.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
