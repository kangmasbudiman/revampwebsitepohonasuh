"use client";

import { useActionState } from "react";
import { tambahLokasi, updateLokasi } from "@/lib/actions/lokasi";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiLokasi } from "@/lib/api";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-200";

const SKEMA = [
  "Hutan Adat/HA",
  "Hutan Desa (Village Forest)",
  "Hutan Kemasyarakatan",
  "Customary Forest/HA",
  "Village Forest",
];

export default function LokasiForm({ lokasi }: { lokasi?: ApiLokasi }) {
  const edit = Boolean(lokasi);
  const [state, action, pending] = useActionState<AdminState, FormData>(
    edit ? updateLokasi : tambahLokasi,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      {edit && <input type="hidden" name="id" value={lokasi!.id} />}
      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nama Desa (slug) *</label>
          <input
            name="nama"
            type="text"
            required
            defaultValue={lokasi?.nama ?? ""}
            placeholder="rantaukermas"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Huruf kecil tanpa spasi — dipakai sebagai kunci pohon &amp; adopsi.
            {edit && " Mengubah nama akan memindahkan semua pohon dan data adopsi ke nama baru."}
          </p>
        </div>
        <div>
          <label className={labelClass}>Label Tampilan</label>
          <input
            name="label"
            type="text"
            defaultValue={lokasi?.label ?? ""}
            placeholder="Rantau Kermas"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Kode Cert</label>
          <input
            name="kode_cert"
            type="text"
            defaultValue={lokasi?.kodeCert ?? ""}
            placeholder="RA"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Prefix sertifikat (LPHD-<b>RA</b>/2026).
          </p>
        </div>
        <div>
          <label className={labelClass}>Kode Pohon</label>
          <input
            name="kode_pohon"
            type="text"
            defaultValue={lokasi?.kodePohon ?? ""}
            placeholder="A"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Prefix ID pohon — sebaiknya unik antar lokasi.
          </p>
        </div>
        <div>
          <label className={labelClass}>Skema / Institusi</label>
          <input
            name="skema"
            type="text"
            list="lokasi-skema"
            defaultValue={lokasi?.skema ?? ""}
            className={inputClass}
          />
          <datalist id="lokasi-skema">
            {SKEMA.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Kecamatan</label>
          <input
            name="kecamatan"
            type="text"
            defaultValue={lokasi?.kecamatan ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Kabupaten</label>
          <input
            name="kabupaten"
            type="text"
            defaultValue={lokasi?.kabupaten ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Provinsi</label>
          <input
            name="provinsi"
            type="text"
            defaultValue={lokasi?.provinsi ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Latitude</label>
          <input
            name="latitude"
            type="text"
            defaultValue={lokasi?.lat ?? ""}
            placeholder="-1.6417251"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Longitude</label>
          <input
            name="longitude"
            type="text"
            defaultValue={lokasi?.lng ?? ""}
            placeholder="103.5844998"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Profil Singkat</label>
        <textarea
          name="profil"
          rows={3}
          defaultValue={lokasi?.profil ?? ""}
          placeholder="Deskripsi lokasi yang tampil di halaman publik…"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>URL Foto</label>
        <input
          name="foto"
          type="text"
          defaultValue={lokasi?.foto ?? ""}
          placeholder="https://rest.pohonasuh.org/assets/…"
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={lokasi ? lokasi.aktif : true}
          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
        />
        Aktif — tampil di halaman publik web
      </label>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : edit ? "Simpan Perubahan" : "Tambah Lokasi"}
        </button>
      </div>
    </form>
  );
}
