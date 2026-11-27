export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-emerald-100" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-full bg-zinc-100" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
            <div className="h-44 animate-pulse bg-emerald-50" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
