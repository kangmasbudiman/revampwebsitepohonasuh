import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import type { ApiPost } from "@/lib/api";
import { getDict } from "@/lib/i18n";

// Paritas kartu blog mobile: thumbnail, kategori, judul, preview deskripsi,
// author + jumlah dibaca.
export default async function PostCard({ post }: { post: ApiPost }) {
  const t = (await getDict()).pages.blog;
  const preview = post.description
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <Link
      href={`/blog/${post.id}`}
      className="group flex h-full gap-4 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">📰</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          {post.category}
        </span>
        <h3 className="mt-1.5 line-clamp-2 font-semibold leading-snug text-emerald-950 group-hover:text-emerald-700">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{preview}</p>
        <p className="mt-auto flex items-center gap-3 pt-2 text-xs text-zinc-500">
          <span className="truncate font-medium text-emerald-800">{post.author}</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {t.timesRead.replaceAll("{n}", String(post.viewer))}
          </span>
        </p>
      </div>
    </Link>
  );
}
