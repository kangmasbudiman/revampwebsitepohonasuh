"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BadgeCheck,
  CalendarDays,
  CloudUpload,
  Info,
  Lightbulb,
  Send,
  Wallet,
  X,
} from "lucide-react";
import { simpanLaporan, unggahFotoLaporan, hapusFotoLaporan } from "@/lib/actions/laporan";
import { LAPORAN_JENIS, type ApiLaporan } from "@/lib/api";
import { MAX_UPLOAD_BYTES } from "@/lib/file-guard";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40";

function Step({
  n,
  title,
  helper,
  className,
  children,
}: {
  n: number;
  title: string;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`flex gap-4 ${className ?? ""}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {helper && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{helper}</p>}
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}

function Contoh({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs leading-relaxed text-zinc-600 dark:bg-emerald-950/40 dark:text-zinc-300">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <p>
        <span className="font-semibold">Contoh: </span>
        {children}
      </p>
    </div>
  );
}

type Staged = { file: File; url: string };

export default function LaporanForm({
  laporan,
  desaList,
  level,
}: {
  laporan?: ApiLaporan;
  desaList: { nama: string; label: string }[];
  level: number;
}) {
  const router = useRouter();
  const edit = Boolean(laporan);
  const terkirim = edit && laporan!.status !== "draft";
  const isAdmin = level === 1;
  const sudahDisetujui = edit && laporan!.status === "disetujui";

  const [isi, setIsi] = useState(laporan?.isi ?? "");
  const [hasil, setHasil] = useState(laporan?.hasil ?? "");
  const [dana, setDana] = useState(laporan?.dana ? String(Math.round(laporan.dana)) : "");
  const [staged, setStaged] = useState<Staged[]>([]);
  const [fotoErr, setFotoErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"draft" | "terkirim" | "disetujui" | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const danaDigits = dana.replace(/\D/g, "");
  const danaDisplay = danaDigits ? Number(danaDigits).toLocaleString("id-ID") : "";

  const pilihFile = (files: FileList | null) => {
    if (!files?.length) return;
    const err: string[] = [];
    const baru: Staged[] = [];
    for (const f of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        err.push(`${f.name}: format harus JPG, PNG, atau WEBP.`);
      } else if (f.size > MAX_UPLOAD_BYTES) {
        err.push(`${f.name}: melebihi 2MB.`);
      } else {
        baru.push({ file: f, url: URL.createObjectURL(f) });
      }
    }
    setFotoErr(err.length ? err.join(" ") : null);
    if (baru.length) setStaged((s) => [...s, ...baru]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buangStaged = (idx: number) => {
    setStaged((s) => {
      URL.revokeObjectURL(s[idx].url);
      return s.filter((_, i) => i !== idx);
    });
  };

  const hapusFotoTersimpan = async (id: number) => {
    setRemoving(id);
    const r = await hapusFotoLaporan(id, laporan!.id);
    setRemoving(null);
    if (!r.ok) {
      setError(r.error ?? "Gagal menghapus foto.");
      return;
    }
    router.refresh();
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status =
      submitter?.value === "draft" ? "draft" : submitter?.value === "disetujui" ? "disetujui" : "terkirim";

    const fd = new FormData(e.currentTarget);
    fd.set("status", status);
    fd.set("dana", danaDigits);

    if (status !== "draft") {
      const judul = String(fd.get("judul") ?? "").trim();
      const tanggal = String(fd.get("tanggal") ?? "").trim();
      if (!judul || !tanggal || !isi.trim()) {
        setError("Lengkapi nama kegiatan, tanggal, dan uraian kegiatan terlebih dahulu.");
        return;
      }
      if (!danaDigits) {
        setError("Isi dana yang digunakan sebelum mengirim laporan.");
        return;
      }
      if (!hasil.trim()) {
        setError("Isi hasil atau manfaat kegiatan sebelum mengirim laporan.");
        return;
      }
      const jmlFoto = (laporan?.foto.length ?? 0) + staged.length;
      if (!terkirim && jmlFoto === 0) {
        setError("Unggah minimal satu foto kegiatan sebelum mengirim laporan.");
        return;
      }
    }

    setError(null);
    setPending(status);
    const r = await simpanLaporan(fd);
    if (!r.ok || !r.id) {
      setPending(null);
      setError(r.error ?? "Gagal menyimpan laporan.");
      return;
    }
    const gagal: string[] = [];
    for (let i = 0; i < staged.length; i++) {
      setProgress(`Mengunggah foto ${i + 1} dari ${staged.length}…`);
      const u = await unggahFotoLaporan(r.id, staged[i].file);
      if (!u.ok) gagal.push(u.error ?? `Foto ${i + 1}`);
    }
    setProgress(null);
    setPending(null);
    staged.forEach((s) => URL.revokeObjectURL(s.url));

    if (edit) {
      const param =
        status === "draft"
          ? "saved=1"
          : status === "disetujui"
            ? "disetujui=1"
            : laporan!.status === "draft"
              ? "dikirim=1"
              : "saved=1";
      router.push(`/admin/laporan/${r.id}/edit?${param}`);
    } else {
      router.push(
        `/admin/laporan/${r.id}/edit?${status === "disetujui" ? "disetujui=1" : "created=1"}${gagal.length ? `&error=${encodeURIComponent(gagal.join(" "))}` : ""}`,
      );
    }
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      {edit && <input type="hidden" name="id" value={laporan!.id} />}
      {laporan?.status === "draft" && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <CalendarDays className="h-3.5 w-3.5" />
          Draf — laporan belum dikirim ke tim Pohon Asuh.
        </p>
      )}
      {sudahDisetujui && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <BadgeCheck className="h-3.5 w-3.5" />
          Disetujui — laporan sudah diperiksa tim Pohon Asuh.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2.5 rounded-xl bg-blue-50 px-4 py-3.5 text-sm text-blue-900 dark:bg-blue-950/50 dark:text-blue-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
        <ul className="space-y-1">
          <li>Nama pengurus sudah otomatis dari akun Anda.</li>
          <li>
            Setelah dikirim, laporan akan diperiksa oleh tim Pohon Asuh sebelum ditampilkan di
            website.
          </li>
        </ul>
      </div>

      <ol className="mt-8 grid gap-9 xl:grid-cols-2 xl:gap-x-10">
        <Step n={1} title="Nama Kegiatan" helper="Beri nama singkat dan jelas.">
          <input
            name="judul"
            type="text"
            defaultValue={laporan?.judul === "Draft Laporan" ? "" : (laporan?.judul ?? "")}
            placeholder="mis. Patroli hutan bersama kelompok tani"
            className={inputClass}
          />
          <Contoh>
            Penyaluran sembako Ramadan · Dukungan pendidikan anak · Patroli hutan · Pembelian alat
            kelompok
          </Contoh>
        </Step>

        <Step n={2} title="Jenis & Lokasi Kegiatan" helper="Pilih jenis kegiatan dan desa lokasi.">
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="jenis" defaultValue={laporan?.jenis ?? "tagging"} className={inputClass}>
              {LAPORAN_JENIS.map((j) => (
                <option key={j.key} value={j.key}>
                  {j.label}
                </option>
              ))}
            </select>
            <select name="desa" defaultValue={laporan?.desa ?? ""} className={inputClass}>
              <option value="">— Tanpa desa tertentu —</option>
              {desaList.map((d) => (
                <option key={d.nama} value={d.nama}>
                  {d.label || d.nama}
                </option>
              ))}
            </select>
          </div>
        </Step>

        <Step n={3} title="Kapan kegiatan dilakukan?" helper="Tanggal selesai boleh dikosongkan bila kegiatan selesai di hari yang sama.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Mulai
              <input
                name="tanggal"
                type="date"
                defaultValue={laporan?.tanggal ?? ""}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Selesai <span className="text-zinc-400">(opsional)</span>
              <input
                name="tanggal_selesai"
                type="date"
                defaultValue={laporan?.tanggalSelesai ?? ""}
                className={inputClass}
              />
            </label>
          </div>
        </Step>

        <Step n={4} title="Ceritakan kegiatan" helper="Tuliskan apa yang dikerjakan selama kegiatan.">
          <textarea
            name="isi"
            rows={4}
            maxLength={500}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Siapa yang terlibat, di mana dilakukan, dan apa saja yang dikerjakan…"
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-zinc-400">{isi.length}/500</p>
          <Contoh>
            Siapa yang terlibat, di mana dilakukan, dan apa saja yang dikerjakan.
          </Contoh>
        </Step>

        <Step n={5} title="Berapa dana yang digunakan?" helper="Perkiraan total belanja untuk kegiatan ini.">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-zinc-500">
              Rp
            </span>
            <input
              name="dana"
              type="text"
              inputMode="numeric"
              value={danaDisplay}
              onChange={(e) => setDana(e.target.value)}
              placeholder="0"
              className={`${inputClass} pl-11 text-right font-medium tabular-nums`}
            />
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            Isi sesuai dengan uang yang benar-benar digunakan.
          </div>
        </Step>

        <Step n={6} title="Apa hasil atau manfaat?" helper="Ceritakan dampak kegiatan bagi warga atau pohon.">
          <textarea
            name="hasil"
            rows={4}
            maxLength={500}
            value={hasil}
            onChange={(e) => setHasil(e.target.value)}
            placeholder="mis. 40 keluarga menerima sembako; 15 pohon mendapat papan nama baru…"
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-zinc-400">{hasil.length}/500</p>
          <Contoh>
            Hasil yang terukur lebih meyakinkan — jumlah penerima manfaat, pohon yang ditangani,
            atau alat yang dibeli.
          </Contoh>
        </Step>

        <Step n={7} className="xl:col-span-2" title="Foto Kegiatan" helper="Foto asli kegiatan lebih dipercaya pembaca daripada foto stok.">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => pilihFile(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-6 py-9 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
          >
            <CloudUpload className="mx-auto h-9 w-9 text-emerald-600 dark:text-emerald-400" />
            <span className="mt-2 block text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Klik untuk mengunggah foto
            </span>
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              JPG, PNG, WEBP — maksimal 2MB per foto
            </span>
          </button>

          {fotoErr && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {fotoErr}
            </p>
          )}

          {(edit && laporan!.foto.length > 0) || staged.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {edit &&
                laporan!.foto.map((f) => (
                  <div key={f.id} className="relative h-20 w-20">
                    <Image
                      src={f.url}
                      alt="Foto laporan"
                      fill
                      sizes="80px"
                      className={`rounded-xl object-cover ${removing === f.id ? "opacity-40" : ""}`}
                    />
                    <button
                      type="button"
                      aria-label={`Hapus foto laporan ${f.id}`}
                      disabled={removing !== null}
                      onClick={() => hapusFotoTersimpan(f.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              {staged.map((s, i) => (
                <div key={s.url} className="relative h-20 w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.url}
                    alt={`Foto baru ${i + 1}`}
                    className="h-full w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Buang foto baru ${i + 1}`}
                    onClick={() => buangStaged(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-white shadow-sm hover:bg-zinc-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {progress && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{progress}</p>}
        </Step>
      </ol>

      <div className="mt-10 flex flex-col gap-5 border-t border-zinc-100 pt-6 dark:border-night-800 sm:flex-row">
        {!terkirim && (
          <div className="flex-1">
            <button
              type="submit"
              name="status"
              value="draft"
              disabled={pending !== null}
              className="w-full rounded-xl border border-emerald-600 px-5 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              {pending === "draft" ? "Menyimpan draf…" : "Simpan sebagai Draft"}
            </button>
            <p className="mt-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Laporan dapat dilengkapi dan dikirim nanti.
            </p>
          </div>
        )}
        <div className="flex-1">
          <button
            type="submit"
            name="status"
            value="terkirim"
            disabled={pending !== null}
            className={
              isAdmin && !sudahDisetujui
                ? "w-full rounded-xl border border-emerald-600 px-5 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                : "w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            <Send className="mr-2 inline h-4 w-4" />
            {pending === "terkirim"
              ? progress
                ? "Mengunggah foto…"
                : "Mengirim…"
              : terkirim && edit
                ? "Simpan Perubahan"
                : "Kirim Laporan"}
          </button>
          <p className="mt-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {terkirim && edit
              ? "Perubahan langsung tersimpan pada laporan."
              : "Laporan akan diperiksa oleh tim Pohon Asuh."}
          </p>
        </div>
        {isAdmin && !sudahDisetujui && (
          <div className="flex-1">
            <button
              type="submit"
              name="status"
              value="disetujui"
              disabled={pending !== null}
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BadgeCheck className="mr-2 inline h-4 w-4" />
              {pending === "disetujui"
                ? progress
                  ? "Mengunggah foto…"
                  : "Menyetujui…"
                : terkirim && edit
                  ? "Setujui Laporan"
                  : "Kirim & Setujui"}
            </button>
            <p className="mt-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Laporan langsung ditandai disetujui.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
