import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  User,
  CalendarDays,
  IdCard,
} from "lucide-react";
import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { organisasiSetAction, mintaDokumenUlangAction } from "@/lib/actions/mitra";

export const metadata = { title: "Detail Pendaftaran Organisasi | Pohon Asuh" };

type OrgData = {
  id: number;
  nama: string;
  jenis: string;
  bidang_kegiatan: string;
  website?: string | null;
  negara?: string | null;
  provinsi?: string | null;
  kota?: string | null;
  alamat?: string | null;
  deskripsi?: string | null;
  nama_pj?: string | null;
  jabatan?: string | null;
  divisi?: string | null;
  email_pj?: string | null;
  hp_pj?: string | null;
  profil_org?: string | null;
  dokumen_legal?: string | null;
  surat_penunjukan?: string | null;
  logo?: string | null;
  status: string;
  admin_note?: string | null;
  verified_at?: string | null;
  created_at?: string | null;
};

const STATUS_LABEL: Record<string, [string, string]> = {
  pending_email: ["Menunggu OTP", "bg-amber-100 text-amber-800"],
  menunggu_verifikasi: ["Menunggu Verifikasi", "bg-blue-100 text-blue-800"],
  perlu_perbaikan: ["Perlu Perbaikan", "bg-orange-100 text-orange-800"],
  disetujui: ["Disetujui", "bg-emerald-100 text-emerald-800"],
  ditolak: ["Ditolak", "bg-red-100 text-red-800"],
};

const JENIS_LABEL: Record<string, string> = {
  perusahaan: "Perusahaan",
  ngo: "NGO/Organisasi Nonprofit",
  komunitas: "Komunitas",
  yayasan: "Yayasan",
  pendidikan: "Lembaga Pendidikan",
  pemerintah: "Instansi Pemerintah",
  lainnya: "Lainnya",
};

function fmtTanggal(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s.includes("T") || s.length > 10 ? s.replace(" ", "T") : s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default async function DetailOrganisasiPage(props: PageProps<"/admin/pendaftaran-organisasi/[id]">) {
  await requireAdminLevel();
  const { id: idParam } = await props.params;
  const sp = await props.searchParams;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const base = process.env.API_BASE_URL ?? "";
  const key = process.env.ADMIN_API_KEY ?? "";
  const assetOrigin = base.replace(/\/api\/?$/, "");

  let org: OrgData | null = null;
  let member: Record<string, unknown> | null = null;
  let assets: Record<string, string> = {};
  let fetchError: string | null = null;
  try {
    const res = await fetch(`${base}/organisasiDetailAdmn?id=${id}`, {
      headers: { "X-Admin-Key": key },
      cache: "no-store",
    });
    const json = await res.json();
    if (res.ok) {
      org = (json.data as OrgData) ?? null;
      member = (json.member as Record<string, unknown>) ?? null;
      assets = (json.assets as Record<string, string>) ?? {};
    } else {
      fetchError = json?.pesan ?? `Gagal memuat (HTTP ${res.status})`;
    }
  } catch {
    fetchError = "Gagal menghubungi server API.";
  }
  if (!fetchError && !org) notFound();

  const assetUrl = (file?: string | null) => (file ? `${assetOrigin}/assets/${file}` : "");

  const status = org ? STATUS_LABEL[org.status] ?? [org.status, "bg-zinc-100 text-zinc-600"] : ["", ""];

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <Link href="/admin/pendaftaran-organisasi" className="text-sm font-medium text-emerald-700 hover:underline">
        <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden />
        Kembali ke daftar
      </Link>

      {sp?.saved && <SuccessPopup paramKey="saved" title="Tersimpan">Status pendaftaran diperbarui.</SuccessPopup>}
      {sp?.dokreq && <SuccessPopup paramKey="dokreq" title="Email Terkirim">Permintaan upload dokumen dikirim ke penanggung jawab.</SuccessPopup>}
      {sp?.error && <SuccessPopup paramKey="error" tone="err" title="Gagal" buttonLabel="Tutup">{String(sp.error)}</SuccessPopup>}

      {fetchError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{fetchError}</p>
      ) : (
        org && (
          <>
            {/* Header */}
            <div className="mt-4 flex flex-wrap items-start justify-between gap-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm dark:border-night-700 dark:bg-night-900">
              <div className="flex items-start gap-4">
                {assets.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(assets.logo)} alt={`Logo ${org.nama}`} className="h-20 w-20 rounded-2xl border border-zinc-200 bg-white object-contain" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
                    <Building2 className="h-8 w-8 text-emerald-600" aria-hidden />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">{org.nama}</h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    {JENIS_LABEL[org.jenis] ?? org.jenis} · {org.bidang_kegiatan}
                  </p>
                  {org.website && (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                      <Globe className="h-3.5 w-3.5" aria-hidden />{org.website}
                    </a>
                  )}
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-400">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />Mendaftar {fmtTanggal(org.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${status[1]}`}>{status[0]}</span>
                {org.verified_at && <p className="text-[11px] text-zinc-500">Diproses {fmtTanggal(org.verified_at)}</p>}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {/* Organisasi */}
              <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-800"><Building2 className="h-4 w-4" />Organisasi</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Jenis</dt><dd className="text-zinc-800">{JENIS_LABEL[org.jenis] ?? org.jenis}</dd></div>
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Bidang</dt><dd className="text-zinc-800">{org.bidang_kegiatan}</dd></div>
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Negara</dt><dd className="text-zinc-800">{org.negara ?? "Indonesia"}</dd></div>
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Provinsi / Kota</dt><dd className="text-zinc-800">{org.provinsi ?? "—"} · {org.kota ?? "—"}</dd></div>
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Alamat</dt><dd className="flex items-start gap-1 text-zinc-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />{org.alamat ?? "—"}</dd></div>
                </dl>
                {org.deskripsi && <p className="mt-3 whitespace-pre-line rounded-xl bg-emerald-50/50 p-3 text-sm text-zinc-700">{org.deskripsi}</p>}
              </section>

              {/* Penanggung Jawab */}
              <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-800"><User className="h-4 w-4" />Penanggung Jawab</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Nama</dt><dd className="text-zinc-800">{org.nama_pj ?? "—"}</dd></div>
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Jabatan</dt><dd className="text-zinc-800">{org.jabatan ?? "—"}</dd></div>
                  {org.divisi && <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Divisi</dt><dd className="text-zinc-800">{org.divisi}</dd></div>}
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">Email</dt><dd><a href={`mailto:${org.email_pj ?? ""}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><Mail className="h-4 w-4" />{org.email_pj ?? "—"}</a></dd></div>
                  <div className="flex gap-2"><dt className="w-28 shrink-0 text-zinc-400">WhatsApp</dt><dd><a href={`https://wa.me/${String(org.hp_pj ?? "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><MessageCircle className="h-4 w-4" />{org.hp_pj ?? "—"}</a></dd></div>
                </dl>
                {member && (
                  <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600">
                    <p className="font-semibold text-zinc-700"><IdCard className="mr-1 inline h-4 w-4" />Akun login</p>
                    <p className="mt-1">Email login: <span className="font-mono">{String(member.email ?? "")}</span></p>
                    <p>Terdaftar: {fmtTanggal(String(member.tanggal ?? ""))}</p>
                  </div>
                )}
              </section>
            </div>

            {/* Dokumen */}
            <section className="mt-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-800"><FileText className="h-4 w-4" />Dokumen Pendukung</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  ["Profil Organisasi", assets.profil_org],
                  ["Dokumen Legalitas", assets.dokumen_legal],
                  ["Surat Penunjukan PJ", assets.surat_penunjukan],
                ].map(([label, file]) =>
                  file ? (
                    <a key={String(label)} href={assetUrl(String(file))} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-emerald-100 p-4 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
                      <FileText className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                      <span className="break-all">{String(label)}<span className="block text-[11px] font-normal text-zinc-400">Klik untuk buka</span></span>
                    </a>
                  ) : (
                    <div key={String(label)} className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-400">
                      {String(label)}<span className="block text-[11px]">Tidak diunggah</span>
                    </div>
                  ),
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-50 pt-4">
                <div className="max-w-md text-xs text-zinc-500">
                  <p className="font-semibold text-zinc-700">Butuh dokumen dari penanggung jawab?</p>
                  <p className="mt-0.5">Kirim tautan sekali pakai (berlaku 24 jam) ke email PJ untuk mengunggah dokumen di atas tanpa perlu mendaftar ulang.</p>
                </div>
                <form action={mintaDokumenUlangAction}>
                  <input type="hidden" name="idorga" value={String(org.id)} />
                  <ConfirmSubmit message={`Kirim tautan upload dokumen ke ${org.email_pj}?`} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">
                    Minta Upload Ulang Dokumen
                  </ConfirmSubmit>
                </form>
              </div>
            </section>

            {org.admin_note && (
              <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
                <h2 className="text-xs font-bold uppercase tracking-wider">Catatan Admin</h2>
                <p className="mt-1 whitespace-pre-line">{org.admin_note}</p>
              </section>
            )}

            {/* Aksi verifikasi */}
            <section className="mt-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-night-700 dark:bg-night-900">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800">Aksi Verifikasi</h2>
              <form action={organisasiSetAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="idorga" value={String(org.id)} />
                <select name="aksi" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
                  <option value="setujui">Setujui</option>
                  <option value="perbaikan">Minta Perbaikan</option>
                  <option value="tolak">Tolak</option>
                </select>
                <input name="note" defaultValue={org.admin_note ?? ""} placeholder="catatan (wajib untuk perbaikan/tolak)" className="min-w-[260px] flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
                <ConfirmSubmit message="Teruskan?" className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                  Simpan Status
                </ConfirmSubmit>
              </form>
            </section>
          </>
        )
      )}
    </main>
  );
}
