import { requireUser } from "@/lib/guard";
import { apiPost } from "@/lib/api";

export const metadata = { title: "Portal Mitra | Pohon Asuh" };

export default async function MitraDashboardPage() {
  const session = await requireUser();
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-950">DEBUG</h1>
      <p>userId: {session.userId}</p>
      <p>name: {session.name}</p>
      <p>role: {session.role}</p>
      <p>mitraId: {String(session.mitraId)}</p>
      <p>hak: {JSON.stringify(session.hak)}</p>
    </main>
  );
}
