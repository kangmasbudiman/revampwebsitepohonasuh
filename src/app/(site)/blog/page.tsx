import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import { apiGet, apiPost, mapPosts, type ApiPost } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import PostCard from "@/components/post-card";

export async function generateMetadata() {
  return { title: (await getDict()).pages.blog.title };
}

export default async function BlogListPage(props: PageProps<"/blog">) {
  const searchParams = await props.searchParams;
  const d = (await getDict()).pages.blog;

  // Nilai chip = nilai kategori di DB (lowercase) agar pencocokan tidak
  // bergantung pada collation MySQL.
  const KATEGORI = [
    { value: "artikel", label: d.catArticle },
    { value: "berita", label: d.catNews },
  ];
  const kategori =
    typeof searchParams.kategori === "string" && KATEGORI.some((k) => k.value === searchParams.kategori)
      ? searchParams.kategori
      : undefined;

  let posts: ApiPost[] = [];
  let error = false;
  try {
    const rows = kategori
      ? await apiPost<Record<string, unknown>[]>("blogbyfilter", { kategori })
      : await apiGet<Record<string, unknown>[]>("blog");
    posts = mapPosts(rows).sort((a, b) => b.id - a.id);
  } catch {
    error = true;
  }

  const [featured, ...rest] = posts;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">{d.heading}</h1>
      <p className="mt-2 text-zinc-600">{d.intro}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/blog"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !kategori
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          {d.all}
        </Link>
        {KATEGORI.map((k) => (
          <Link
            key={k.value}
            href={`/blog?kategori=${k.value}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              kategori === k.value
                ? "bg-emerald-600 text-white"
                : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {k.label}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="mt-10 text-center text-zinc-500">
          {d.loadError}{" "}
          <Link href="/blog" className="font-medium text-emerald-700 hover:underline">
            {d.retry}
          </Link>
        </p>
      ) : (
        <>
          {featured && (
            <Link
              href={`/blog/${featured.id}`}
              className="group mt-6 grid overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:grid-cols-2"
            >
              <div className="relative h-56 w-full bg-emerald-50 md:h-full md:min-h-64">
                {featured.coverUrl ? (
                  <Image
                    src={featured.coverUrl}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">📰</div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  {d.latest}
                </span>
              </div>
              <div className="flex flex-col p-6">
                <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  {featured.category}
                </span>
                <h2 className="mt-2 text-xl font-bold leading-snug text-emerald-950 group-hover:text-emerald-700 md:text-2xl">
                  {featured.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
                  {featured.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                </p>
                <p className="mt-auto flex items-center gap-3 pt-4 text-sm text-zinc-500">
                  <span className="font-medium text-emerald-800">{featured.author}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {d.timesRead.replaceAll("{n}", String(featured.viewer))}
                  </span>
                </p>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {posts.length === 0 && (
            <p className="mt-10 text-center text-zinc-500">{d.empty}</p>
          )}
        </>
      )}
    </main>
  );
}
