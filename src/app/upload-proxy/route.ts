// Proxy same-origin untuk byte gambar /upload/* dari host API — fetch
// langsung dari browser diblokir CORS (Laravel hanya meng-cover api/*),
// sedangkan embed foto ke PDF butuh akses piksel via canvas.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");
  try {
    const u = new URL(raw);
    if (u.origin !== base || !u.pathname.startsWith("/upload/")) {
      return new Response("Forbidden", { status: 403 });
    }
    const upstream = await fetch(u.toString(), { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return new Response("Upstream error", { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
}
