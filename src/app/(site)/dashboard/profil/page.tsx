import { apiPost } from "@/lib/api";
import { requireUser } from "@/lib/guard";
import { getDict } from "@/lib/i18n";
import ProfileForm, { type ProfilData } from "@/components/profile-form";

export async function generateMetadata() {
  return { title: (await getDict()).dashboard.profil.title };
}

export default async function ProfilPage(props: PageProps<"/dashboard/profil">) {
  const session = await requireUser();
  const d = (await getDict()).dashboard.profil;
  const SAVED_MESSAGE: Record<string, string> = {
    data: d.savedData,
    pw: d.savedPw,
    foto: d.savedFoto,
  };
  const searchParams = await props.searchParams;
  const saved = typeof searchParams.saved === "string" ? searchParams.saved : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  let profil: ProfilData | null = null;
  try {
    const res = await apiPost<Record<string, unknown>>("getprofil", { id: session.userId });
    profil = {
      id: Number(res.id) || session.userId,
      name: String(res.name ?? ""),
      emaile: String(res.emaile ?? ""),
      hp: String(res.hp ?? ""),
      job: String(res.job ?? ""),
      address: String(res.address ?? ""),
      foto: res.foto ? String(res.foto) : null,
    };
  } catch {
    // form di bawah menampilkan pesan gagal
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-emerald-950">{d.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{d.sub}</p>

      {saved && SAVED_MESSAGE[saved] && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {SAVED_MESSAGE[saved]}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {profil ? (
        <ProfileForm profil={profil} />
      ) : (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {d.loadError}
        </p>
      )}
    </main>
  );
}
