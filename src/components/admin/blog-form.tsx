"use client";

import { useActionState } from "react";
import { createBlog, updateBlog } from "@/lib/actions/blog";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiPost } from "@/lib/api";
import { cekUkuranFile } from "@/lib/file-guard";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

export default function BlogForm({ post }: { post?: ApiPost }) {
  const isEdit = !!post;
  const [state, action, pending] = useActionState<AdminState, FormData>(
    isEdit ? updateBlog : createBlog,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={post?.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Judul *</label>
          <input
            name="title"
            type="text"
            required
            defaultValue={post?.title}
            className={inputClass}
            placeholder="Judul artikel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Kategori *</label>
          <select name="category" required className={inputClass} defaultValue={post?.category ?? "artikel"}>
            <option value="artikel">Artikel</option>
            <option value="berita">Berita</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Isi / Deskripsi *</label>
        <textarea
          name="description"
          required
          rows={8}
          defaultValue={post?.description}
          className={inputClass}
          placeholder="Tulis isi artikel di sini…"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Cover <span className="text-zinc-400 dark:text-zinc-500">(jpg/png/webp, maks 2MB)</span>
        </label>
        <input
          name="cover"
          type="file"
          onChange={cekUkuranFile}
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:file:bg-night-800 dark:file:text-emerald-300"
        />
        {isEdit && post?.coverUrl && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Biarkan kosong untuk mempertahankan cover yang ada.
          </p>
        )}
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state.saved && !state.error && (
        <p className="rounded-lg bg-emerald-50 dark:bg-night-800 px-3 py-2 text-sm text-emerald-700">
          Artikel tersimpan.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Artikel"}
      </button>
    </form>
  );
}
