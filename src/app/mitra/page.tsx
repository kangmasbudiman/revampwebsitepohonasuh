import { requireUser } from "@/lib/guard";
import { apiPost, apiGet, mapTrees, mapProgramMitra, type ApiTree, type ApiProgramMitra } from "@/lib/api";
import Link from "next/link";
import SuccessPopup from "@/components/admin/success-popup";
import { TreePine, HeartHandshake, Sprout, CheckCircle, Clock } from "lucide-react";

export const metadata = { title: "Portal Mitra | Pohon Asuh" };

export default async function MitraDashboardPage(props: PageProps<"/mitra">) {
  const session = await requireUser();
  const sp = await props.searchParams;

  let info: { mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null; aktif: number }; member: { id: number; name: string; emaile: string } } | null = null;
  let adopsi: Record<string, unknown>[] = [];
  let heldTrees: ApiTree[] = [];
  try {
    const res = await apiPost<{
      value?: number;
      mitra: { id: number; nama: string; slug: string; logo: string | null; tagging_template: string | null; aktif: number };
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

  let programs: ApiProgramMitra[] = [];
  try {
    const rows = await apiGet<Record<string, unknown>[]>(`programmitralist?mitra_id=${info!.mitra.id}`);
    programs = (rows as Record<string, unknown>[]).map(mapProgramMitra);
  } catch {
    programs = [];
  }
  try {
    const res = await apiGet<{ data?: Record<string, unknown>[] }>(
      "pohonmapall?page=1&per_page=200&status=MITRA",
    );
    heldTrees = mapTrees(res.data ?? []).filter((t) => t.mitraId === info!.mitra.id);
  } catch {
    heldTrees = [];
  }

  const certCount = adopsi.filter((a) => a.certnum).length;
  const menungguVerifikasi = adopsi.filter((a) => !a.certnum).length;
  const programAktif = programs.filter((p) => p.aktif).length;

  // Aktivitas terbaru: adopsi + request hold, gabung, urutkan terbaru
  type Activity = { id: string; label: string; detail: string; waktu: string | null };
  const activities: Activity[] = [];
  for (const a of adopsi) {
    const idPohon = String(a.idpohon ?? "");
    const nama = String(a.nama ?? "");
    const tgl = String(a.tgl_adopt ?? a.created_at ?? "");
    const verified = Boolean(a.certnum);
    activities.push({
      id: `a-${a.id}`,
      label: verified ? "Adopsi terverifikasi" : "Adopsi menunggu verifikasi",
      detail: `${nama} — ${idPohon}`,
      waktu: tgl || null,
    });
  }
  try {
    const reqs = await apiPost<Record<string, unknown>[]>("mitramyrequests", { idmember: session.userId });
    if (Array.isArray(reqs)) {
      for (const r of reqs) {
        activities.push({
          id: `r-${r.id}`,
          label: `Request hold ${String(r.status ?? "")}`,
          detail: String(r.idpohon ?? ""),
          waktu: r.created_at ? String(r.created_at) : null,
        });
      }
    }
  } catch {}
  activities.sort((a, b) => String(b.waktu ?? "").localeCompare(String(a.waktu ?? "")));
  const recent = activities.slice(0, 6);

  const cards = [
    { label: "Program Aktif", value: programAktif, icon: Sprout, href: "/mitra/program" },
    { label: "Pohon Ditahan", value: heldTrees.length, icon: TreePine, href: "/mitra/pohon" },
    { label: "Adopsi Tercatat", value: adopsi.length, icon: HeartHandshake, href: "/mitra/adopsi" },
    { label: "Menunggu Verifikasi", value: menungguVerifikasi, icon: Clock, href: "/admin/verifikasi" },
  ];

  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold pa-hgrad">Portal Mitra</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Halo, {info!.member.name} — mitra: <strong>{info!.mitra.nama}</strong>
        </p>
      </div>

      {sp?.sukses && <SuccessPopup paramKey="sukses" title="Berhasil">Request hold terkirim, menunggu approval admin.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {info!.mitra.aktif === 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            ⏳ Akun mitra menunggu aktivasi
          </p>
          <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">
            Permohonan Anda sudah diterima. Admin KKI Warsi sedang memeriksa identitas
            lembaga Anda sebelum mengaktifkan akun. Anda dapat melihat portal tetapi
            belum bisa melakukan pemesanan hingga diaktifkan.
          </p>
        </div>
      )}

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

      <div className="grid gap-4 lg:grid-cols-5">
        <Link href="/mitra/sertifikat" className="lg:col-span-2 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm transition-shadow hover:shadow-md dark:border-night-700">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Pohon Sudah Diadopsi</p>
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-4xl font-bold text-emerald-700 dark:text-emerald-300">{certCount}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Sertifikat sudah terbit</p>
        </Link>

        <div className="lg:col-span-3 rounded-2xl border border-emerald-100 pa-card p-6 shadow-sm dark:border-night-700">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Aktivitas Terbaru</p>
            <Link href="/mitra/adopsi" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
              Lihat semua →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-emerald-50 dark:divide-night-800">
            {recent.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Belum ada aktivitas.
              </p>
            )}
            {recent.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{a.label}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{a.detail}</p>
                  {a.waktu && <p className="text-[11px] text-zinc-400">{a.waktu}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
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
