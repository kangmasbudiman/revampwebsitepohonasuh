import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapTrees, type ApiTree } from "@/lib/api";
import Link from "next/link";
import SuccessPopup from "@/components/admin/success-popup";
import { TreePine, HeartHandshake, Award, ClipboardCheck } from "lucide-react";

export const metadata = { title: "Portal Mitra | Pohon Asuh" };

export default async function MitraDashboardPage(props: PageProps<"/mitra">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let info: { mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null }; member: { id: number; name: string; emaile: string } } | null = null;
  let adopsi: Record<string, unknown>[] = [];
  let heldTrees: ApiTree[] = [];
  let pendingRequests = 0;
  try {
    const res = await apiPost<{
      value?: number;
      mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null };
      member: { id: number; name: string; emaile: string };
    }>("mitramyinfo", { idmember: session.userId });
    if (Number(res.value) === 200) info = res;
  } catch {
    // bukan mitra
  }
  if (!info) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  try {
    adopsi = await apiPost<Record<string, unknown>[]>("mitramyadopsi", { idmember: session.userId });
  } catch {
    adopsi = [];
  }
  try {
    const res = await apiGet<{ data?: Record<string, unknown>[] }>(
      "pohonmapall?page=1&per_page=200&status=MITRA",
    );
    heldTrees = mapTrees(res.data ?? []).filter((t) => t.mitraId === info!.mitra.id);
  } catch {
    heldTrees = [];
  }
  try {
    const reqs = await apiPost<Record<string, unknown>[]>("mitramyrequests", { idmember: session.userId });
    pendingRequests = Array.isArray(reqs) ? reqs.filter((r) => r.status === "pending").length : 0;
  } catch {
    pendingRequests = 0;
  }

  const certCount = adopsi.filter((a) => a.certnum).length;

  const cards = [
    { label: "Pohon Ditahan", value: heldTrees.length, icon: TreePine, href: "/mitra/pohon" },
    { label: "Adopsi Tercatat", value: adopsi.length, icon: HeartHandshake, href: "/mitra/adopsi" },
    { label: "Sertifikat Terbit", value: certCount, icon: Award, href: "/mitra/sertifikat" },
    { label: "Request Pending", value: pendingRequests, icon: ClipboardCheck, href: "/admin/mitra-requests" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold pa-hgrad">Portal Mitra</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Halo, {info!.member.name} — mitra: <strong>{info!.mitra.nama}</strong>
        </p>
      </div>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Berhasil">Request hold terkirim, menunggu approval admin.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-emerald-100 pa-card p-5 shadow-sm transition-shadow hover:shadow-md dark:border-night-700"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{c.label}</p>
              <c.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/mitra/pohon" className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md dark:border-night-700 dark:bg-night-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Request Hold Pohon</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Pesan pohon baru untuk mitra</p>
        </Link>
        <Link href="/mitra/adopsi" className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md dark:border-night-700 dark:bg-night-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Input Adopsi Mitra</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Catat adopsi dari data mitra</p>
        </Link>
        <Link href="/mitra/sertifikat" className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md dark:border-night-700 dark:bg-night-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Sertifikat</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Lihat sertifikat terbit</p>
        </Link>
        <Link href="/dashboard" className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:shadow-md dark:border-night-700 dark:bg-night-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Dashboard Saya</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Adopsi pribadi</p>
        </Link>
      </div>
    </div>
  );
}
