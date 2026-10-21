"use client";

import { useActionState, useState } from "react";
import { Check, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import type { ApiMember, ApiRole } from "@/lib/api";
import { IZIN } from "@/lib/hak";
import { hapusRole, setMemberRole, simpanRole } from "@/lib/actions/role";
import ConfirmSubmit from "@/components/admin/confirm-submit";

const labelIzin = (ids: string[]): string =>
  ids
    .map((id) => IZIN.find((i) => i.id === id)?.label ?? id)
    .join(", ") || "—";

const namaRole = (roles: ApiRole[], idrole: number | null): string =>
  idrole ? (roles.find((r) => r.id === idrole)?.nama ?? "—") : "Tanpa role";

export default function RoleManager({
  roles,
  staf,
}: {
  roles: ApiRole[];
  staf: ApiMember[];
}) {
  const [state, submit, pending] = useActionState(simpanRole, {});
  const [edit, setEdit] = useState<ApiRole | null>(null);

  const inputClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

  return (
    <div className="mt-6 space-y-10">
      {/* ===== Role & izin ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Role &amp; Izin
        </h2>

        <form
          key={edit?.id ?? "baru"}
          action={submit}
          className="mt-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-night-700 dark:bg-night-900"
          data-testid={edit ? "form-edit-role" : "form-tambah-role"}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-52 flex-1">
              <label htmlFor="role-nama" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Nama role
              </label>
              <input
                id="role-nama"
                name="nama"
                defaultValue={edit?.nama ?? ""}
                placeholder="mis. Petugas Memo"
                className={`${inputClass} mt-1`}
                data-testid="role-nama"
                required
              />
            </div>
            <fieldset className="flex flex-1 flex-wrap items-center gap-4 pb-1">
              <legend className="sr-only">Izin role</legend>
              {IZIN.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    name={`izin_${i.id}`}
                    defaultChecked={edit?.izin.includes(i.id) ?? false}
                    className="h-4 w-4 accent-emerald-600"
                    data-testid={`role-izin-${i.id}`}
                  />
                  {i.label}
                </label>
              ))}
            </fieldset>
            {edit && <input type="hidden" name="id" value={edit.id} />}
            <button
              type="submit"
              disabled={pending}
              data-testid="simpan-role"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {edit ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {edit ? "Simpan Perubahan" : "Tambah Role"}
            </button>
            {edit && (
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
              >
                Batal
              </button>
            )}
          </div>
          {state?.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" data-testid="role-error">
              {state.error}
            </p>
          )}
        </form>

        {roles.length === 0 ? (
          <p className="mt-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-8 text-center text-sm text-zinc-500 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-zinc-400">
            Belum ada role — buat role pertama lewat form di atas.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-night-700 dark:bg-night-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-night-700 dark:bg-night-800/60 dark:text-zinc-400">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Izin</th>
                  <th className="px-4 py-3">Anggota</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody data-testid="tabel-role">
                {roles.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0 dark:border-night-800">
                    <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-100">{r.nama}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{labelIzin(r.izin)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.jumlah} staf
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEdit(r)}
                          data-testid={`edit-role-${r.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <form action={hapusRole}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmSubmit
                            message={`Hapus role "${r.nama}"? Staf pemakainya akan kembali tanpa role.`}
                            confirmLabel="Ya, Hapus"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Daftar staf + assign role ===== */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-100">
          <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Staf &amp; Role-nya
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Pilih role untuk tiap staf — admin (level 1) selalu memiliki semua izin. Perubahan
          berlaku saat staf login ulang.
        </p>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-night-700 dark:bg-night-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-night-700 dark:bg-night-800/60 dark:text-zinc-400">
                <th className="px-4 py-3">Staf</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Simpan</th>
              </tr>
            </thead>
            <tbody data-testid="tabel-staf">
              {staf.map((m) => (
                <tr key={m.id} className="border-b border-zinc-50 last:border-0 dark:border-night-800">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{m.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.emaile}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        m.admin === 1
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      }`}
                    >
                      {m.admin === 1 ? "Admin" : "Petugas"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {namaRole(roles, m.idrole)}
                  </td>
                  <td className="px-4 py-3">
                    <form action={setMemberRole} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="idmember" value={m.id} />
                      <select
                        name="idrole"
                        defaultValue={m.idrole ?? ""}
                        aria-label={`Role staf ${m.name}`}
                        data-testid={`staf-select-${m.id}`}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                      >
                        <option value="">Tanpa role</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        aria-label={`Simpan role ${m.name}`}
                        data-testid={`staf-simpan-${m.id}`}
                        className="rounded-xl bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
