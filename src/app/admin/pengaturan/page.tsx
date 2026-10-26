import { requireAdminLevel } from "@/lib/guard";
import SuccessPopup from "@/components/admin/success-popup";
import { apiGet, IKON_SOSMED, mapKontak, mapSosmedList, type ApiKontak, type ApiSosmed } from "@/lib/api";
import { addNoadmin, addSosmed, deleteNoadmin, deleteSosmed, editNoadmin, editSosmed } from "@/lib/actions/setting";
import KontakForm from "@/components/admin/kontak-form";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import SosmedIcon from "@/components/sosmed-icon";

export const metadata = { title: "Pengaturan | Pohon Asuh" };

type Noadmin = { id: number; nomer: string };

export default async function PengaturanPage({
  searchParams,
}: PageProps<"/admin/pengaturan">) {
  await requireAdminLevel();
  const sp = await searchParams;

  let kontak: ApiKontak | null = null;
  try {
    kontak = mapKontak(await apiGet<Record<string, unknown>>("getkontak"));
  } catch {
    kontak = null;
  }

  let nomorWa: Noadmin[] = [];
  try {
    nomorWa = (await apiGet<Record<string, unknown>[]>("getnoadmin")).map((r) => ({
      id: Number(r.id),
      nomer: String(r.nomer_admin ?? ""),
    }));
  } catch {
    nomorWa = [];
  }

  let sosmed: ApiSosmed[] = [];
  try {
    sosmed = mapSosmedList(await apiGet<Record<string, unknown>[]>("getsosmed"));
  } catch {
    sosmed = [];
  }

  const waLink = (nomer: string) => {
    const digits = nomer.replace(/[^0-9]/g, "").replace(/^0/, "62");
    return `https://wa.me/${digits}`;
  };

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <h1 className="text-xl font-bold pa-hgrad">Pengaturan</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Kontak organisasi — dipakai di footer website dan halaman Kontak (sama dengan aplikasi
        mobile).
      </p>

      {sp?.wasaved && (
        <SuccessPopup paramKey="wasaved" title="Tersimpan">
          {String(sp.wasaved)}
        </SuccessPopup>
      )}
      {sp?.waerror && (
        <SuccessPopup paramKey="waerror" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.waerror)}
        </SuccessPopup>
      )}
      {sp?.sosmedsaved && (
        <SuccessPopup paramKey="sosmedsaved" title="Tersimpan">
          {String(sp.sosmedsaved)}
        </SuccessPopup>
      )}
      {sp?.sosmederror && (
        <SuccessPopup paramKey="sosmederror" tone="err" title="Gagal" buttonLabel="Tutup">
          {String(sp.sosmederror)}
        </SuccessPopup>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        {kontak ? (
          <KontakForm kontak={kontak} />
        ) : (
          <p className="rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            Gagal memuat data kontak. Muat ulang halaman untuk mencoba lagi.
          </p>
        )}
      </div>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <h2 className="text-lg font-bold pa-hgrad">
          Nomor WhatsApp Admin
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ditampilkan di halaman checkout sebagai kontak bantuan pengadopsi (paritas aplikasi
          mobile). Format bebas, mis. +62857… atau 0857…
        </p>

        <div className="mt-4 space-y-2">
          {nomorWa.map((n) => (
            <div
              key={n.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 px-3 py-2 dark:border-night-700"
            >
              <form action={editNoadmin} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={n.id} />
                <input
                  name="nomer"
                  defaultValue={n.nomer}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                />
                <a
                  href={waLink(n.nomer)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  Tes ↗
                </a>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                >
                  Simpan
                </button>
              </form>
              <form action={deleteNoadmin}>
                <input type="hidden" name="id" value={n.id} />
                <ConfirmSubmit
                  message={`Hapus nomor WA ${n.nomer}?`}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Hapus
                </ConfirmSubmit>
              </form>
            </div>
          ))}
          {nomorWa.length === 0 && (
            <p className="rounded-xl bg-zinc-50 dark:bg-night-800 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
              Belum ada nomor WA admin.
            </p>
          )}
        </div>

        <form action={addNoadmin} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            name="nomer"
            required
            placeholder="+62857…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Tambah Nomor
          </button>
        </form>
      </div>

      <div className="mt-6 max-w-3xl rounded-2xl border border-emerald-100 dark:border-night-700 pa-card p-6 shadow-sm">
        <h2 className="text-lg font-bold pa-hgrad">Media Sosial</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Akun ditampilkan di footer website — jumlah bebas, pilih ikon per akun.
        </p>

        <div className="mt-4 space-y-2">
          {sosmed.map((sm) => (
            <div
              key={sm.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 px-3 py-2 dark:border-night-700"
            >
              <form action={editSosmed} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={sm.id} />
                <SosmedIcon ikon={sm.ikon} className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                <select
                  name="ikon"
                  defaultValue={sm.ikon}
                  aria-label={`Ikon akun ${sm.label}`}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                >
                  {IKON_SOSMED.map((i) => (
                    <option key={i.v} value={i.v}>
                      {i.l}
                    </option>
                  ))}
                </select>
                <input
                  name="label"
                  defaultValue={sm.label}
                  required
                  placeholder="Label"
                  aria-label={`Label akun ${sm.label}`}
                  className="w-28 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                />
                <input
                  name="url"
                  type="url"
                  defaultValue={sm.url}
                  required
                  placeholder="https://…"
                  aria-label={`URL akun ${sm.label}`}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                >
                  Simpan
                </button>
              </form>
              <form action={deleteSosmed}>
                <input type="hidden" name="id" value={sm.id} />
                <ConfirmSubmit
                  message={`Hapus akun ${sm.label}?`}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Hapus
                </ConfirmSubmit>
              </form>
            </div>
          ))}
          {sosmed.length === 0 && (
            <p className="rounded-xl bg-zinc-50 dark:bg-night-800 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
              Belum ada akun media sosial.
            </p>
          )}
        </div>

        <form action={addSosmed} className="mt-4 flex flex-wrap items-center gap-2">
          <select
            name="ikon"
            defaultValue="instagram"
            aria-label="Ikon akun baru"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          >
            {IKON_SOSMED.map((i) => (
              <option key={i.v} value={i.v}>
                {i.l}
              </option>
            ))}
          </select>
          <input
            name="label"
            placeholder="Label (mis. Instagram)"
            className="w-40 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
          <input
            name="url"
            type="url"
            required
            placeholder="https://…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Tambah Akun
          </button>
        </form>
      </div>
    </main>
  );
}
