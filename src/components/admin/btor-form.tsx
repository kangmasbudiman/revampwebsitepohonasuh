"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ClipboardCheck,
  Info,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import { simpanBtor, ambilBtorKandidat } from "@/lib/actions/btor";
import type { ApiBtorDetail, ApiBtorKandidat, ApiPenugasan } from "@/lib/api";
import { namaDesa, rupiah } from "@/lib/format";
import BtorCatatanEditor, {
  parseIsi,
  serializeEntri,
  type CatatanEntri,
} from "@/components/admin/btor-catatan-editor";

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

export default function BtorForm({
  btor,
  penugasan,
  level,
  petugasSaya,
}: {
  btor?: ApiBtorDetail;
  penugasan: ApiPenugasan;
  level: number;
  petugasSaya: { id: number; nama: string };
}) {
  const router = useRouter();
  const edit = Boolean(btor);
  const isAdmin = level === 1;
  const tahunDefault = Number(
    (btor?.tanggal || new Date().toISOString().slice(0, 10)).slice(0, 4),
  );

  const [idpetugas, setIdpetugas] = useState(btor?.idpetugas || petugasSaya.id);
  const [iddesa, setIdDesa] = useState(btor?.iddesa || 0);
  const [kandidat, setKandidat] = useState<ApiBtorKandidat[] | null>(null);
  const [muatErr, setMuatErr] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [terpilih, setTerpilih] = useState<Set<number>>(
    () => new Set((btor?.orders ?? []).map((o) => o.idadopsi)),
  );
  const [entri, setEntri] = useState<CatatanEntri[]>(() =>
    btor?.isi ? parseIsi(btor.isi, tahunDefault) : [],
  );
  const [dana, setDana] = useState(btor?.dana ? String(Math.round(btor.dana)) : "");
  const [hasil, setHasil] = useState(btor?.hasil ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"draft" | "terkirim" | null>(null);

  const petugasOptions = useMemo(
    () =>
      penugasan.petugas.length
        ? penugasan.petugas
        : [{ id: petugasSaya.id, nama: petugasSaya.nama, email: "", jumDesa: 0, desaList: "" }],
    [penugasan.petugas, petugasSaya],
  );

  const desaOptions = useMemo(
    () => penugasan.desa.filter((d) => d.petugas.some((p) => p.id === idpetugas)),
    [penugasan.desa, idpetugas],
  );

  const muatKandidat = async (pid: number, did: number) => {
    if (!pid || !did) {
      setKandidat(null);
      return;
    }
    setMemuat(true);
    setMuatErr(null);
    const r = await ambilBtorKandidat(pid, did, btor?.id ?? 0);
    setMemuat(false);
    if (!r.ok || !r.kandidat) {
      setKandidat(null);
      setMuatErr(r.error ?? "Gagal memuat order selesai.");
      return;
    }
    setKandidat(r.kandidat);
  };

  useEffect(() => {
    void muatKandidat(idpetugas, iddesa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idpetugas, iddesa]);

  const totalOrder = useMemo(
    () =>
      (kandidat ?? []).filter((k) => terpilih.has(k.idadopsi)).reduce((s, k) => s + k.price, 0),
    [kandidat, terpilih],
  );

  const danaDigits = dana.replace(/\D/g, "");
  const danaDisplay = danaDigits ? Number(danaDigits).toLocaleString("id-ID") : "";

  const toggle = (id: number) =>
    setTerpilih((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === "draft" ? "draft" : "terkirim";

    if (status === "terkirim") {
      if (!iddesa) {
        setError("Pilih desa lokasi tagging.");
        return;
      }
      if (terpilih.size === 0) {
        setError("Centang minimal satu order tagging selesai.");
        return;
      }
      if (!serializeEntri(entri).trim()) {
        setError("Isi catatan kegiatan per hari terlebih dahulu.");
        return;
      }
      if (!danaDigits) {
        setError("Isi dana yang digunakan sebelum mengirim BTOR.");
        return;
      }
    }

    const fd = new FormData(e.currentTarget);
    fd.set("idpetugas", String(idpetugas));
    fd.set("iddesa", String(iddesa));
    fd.set("isi", serializeEntri(entri));
    fd.set("dana", danaDigits);
    fd.set("status", status);
    fd.delete("idorder[]");
    for (const id of terpilih) fd.append("idorder[]", String(id));

    setError(null);
    setPending(status);
    const r = await simpanBtor(fd);
    setPending(null);
    if (!r.ok || !r.id) {
      setError(r.error ?? "Gagal menyimpan BTOR.");
      return;
    }
    router.push(
      edit
        ? `/admin/btor/${r.id}?${status === "draft" ? "saved=1" : "dikirim=1"}`
        : `/admin/btor/${r.id}?${status === "draft" ? "saved=1" : "created=1"}`,
    );
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      {btor?.status === "revisi" && btor.catatanRevisi && (
        <p className="mb-4 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
          <span className="font-semibold">Catatan revisi: </span>
          {btor.catatanRevisi}
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
          <li>BTOR dibuat per desa × per petugas dari order tagging yang sudah selesai.</li>
          <li>
            Setelah dikirim, BTOR diperiksa admin; memo pencairan baru bisa terbit setelah
            diverifikasi.
          </li>
        </ul>
      </div>

      <ol className="mt-8 grid gap-9 xl:grid-cols-2 xl:gap-x-10">
        <Step n={1} title="Petugas & Desa" helper="BTOR terikat pada satu petugas di satu desa.">
          <div className="grid gap-3 sm:grid-cols-2">
            {isAdmin ? (
              <select
                aria-label="Pilih petugas"
                value={idpetugas}
                onChange={(e) => {
                  setIdpetugas(Number(e.target.value));
                  setIdDesa(0);
                  setTerpilih(new Set());
                }}
                className={inputClass}
              >
                <option value="">— Pilih petugas —</option>
                {petugasOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" value={petugasSaya.nama} readOnly className={inputClass} />
            )}
            <select
              aria-label="Pilih desa penugasan"
              value={iddesa}
              onChange={(e) => {
                setIdDesa(Number(e.target.value));
                setTerpilih(new Set());
              }}
              className={inputClass}
              disabled={!idpetugas}
            >
              <option value="">— Pilih desa —</option>
              {desaOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {namaDesa(d.nama)}
                </option>
              ))}
            </select>
          </div>
          {!isAdmin && desaOptions.length === 0 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Anda belum ditugaskan di desa mana pun — hubungi admin.
            </p>
          )}
        </Step>

        <Step
          n={2}
          title="Order Tagging Selesai"
          helper="Centang order yang masuk laporan BTOR ini — satu order hanya bisa dilaporkan sekali."
        >
          <div className="min-h-[80px] rounded-xl border border-emerald-100 bg-white p-3 dark:border-night-700 dark:bg-night-900">
            {memuat && (
              <p className="flex items-center gap-2 px-1 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Memuat order selesai…
              </p>
            )}
            {muatErr && <p className="px-1 py-4 text-sm text-red-600 dark:text-red-400">{muatErr}</p>}
            {!memuat && !muatErr && (!iddesa || !idpetugas) && (
              <p className="px-1 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                Pilih petugas dan desa dulu untuk memuat order.
              </p>
            )}
            {!memuat && !muatErr && iddesa && idpetugas && kandidat?.length === 0 && (
              <p className="px-1 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                Tidak ada order tagging selesai yang belum dilaporkan di desa ini.
              </p>
            )}
            {!memuat && !muatErr && (kandidat?.length ?? 0) > 0 && (
              <>
                <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400" data-testid="jml-kandidat">
                  {kandidat!.length} order selesai · {terpilih.size} dipilih
                </p>
                <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {kandidat!.map((k) => (
                    <li key={k.idadopsi}>
                      <label
                        data-testid={`kandidat-${k.idadopsi}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                          terpilih.has(k.idadopsi)
                            ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                            : "border-zinc-200 hover:bg-zinc-50 dark:border-night-700 dark:hover:bg-night-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={terpilih.has(k.idadopsi)}
                          onChange={() => toggle(k.idadopsi)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
                            {k.idpohon} · {k.localname}
                          </span>
                          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {k.invoice} · {k.donatur}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                            {rupiah(k.price)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                              k.punyaFoto
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            <Camera className="h-3 w-3" />
                            {k.jmlFoto} foto{k.punyaFoto ? "" : " · belum ada foto Anda"}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Step>

        <Step
          n={3}
          className="xl:col-span-2"
          title="Kapan kegiatan dilakukan?"
          helper="Tanggal selesai boleh dikosongkan bila tagging selesai di hari yang sama."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Mulai
              <input
                name="tanggal"
                type="date"
                required
                defaultValue={btor?.tanggal ?? new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Selesai <span className="text-zinc-400">(opsional)</span>
              <input
                name="tanggal_selesai"
                type="date"
                defaultValue={btor?.tanggalSelesai ?? ""}
                className={inputClass}
              />
            </label>
          </div>
        </Step>

        <Step
          n={4}
          className="xl:col-span-2"
          title="Catatan Kegiatan"
          helper="Garis waktu kegiatan per hari — otomatis tersusun sebagai lembar BTOR."
        >
          <BtorCatatanEditor value={entri} onChange={setEntri} maxTotal={500} />
        </Step>

        <Step
          n={5}
          title="Dana & Rekening Pencairan"
          helper="Dana otomatis diusulkan dari total order terpilih — boleh disesuaikan."
        >
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
          {totalOrder > 0 && (
            <button
              type="button"
              onClick={() => setDana(String(totalOrder))}
              data-testid="pakai-total-order"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              <Wallet className="h-3.5 w-3.5" />
              Pakai total order terpilih ({rupiah(totalOrder)})
            </button>
          )}
          <div className="mt-3 grid gap-3">
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              a.n. (nama pemilik rekening)
              <input
                name="rekening_at"
                type="text"
                defaultValue={btor?.rekeningAt ?? ""}
                placeholder="mis. Kelompok Taging Lunang"
                className={inputClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-600 dark:text-zinc-300">
                Bank
                <input
                  name="rekening_bank"
                  type="text"
                  defaultValue={btor?.rekeningBank ?? ""}
                  placeholder="mis. BRI"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-zinc-600 dark:text-zinc-300">
                No. rekening
                <input
                  name="rekening_norek"
                  type="text"
                  defaultValue={btor?.rekeningNorek ?? ""}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </Step>

        <Step n={6} title="Apa hasil atau manfaat?" helper="Ceritakan dampak kegiatan bagi warga atau pohon.">
          <textarea
            name="hasil"
            rows={4}
            maxLength={500}
            value={hasil}
            onChange={(e) => setHasil(e.target.value)}
            placeholder="mis. 30 pohon terpasang banner tagging; dokumentasi lengkap untuk donatur…"
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-zinc-400">{hasil.length}/500</p>
        </Step>

        <Step n={7} className="xl:col-span-2" title="Identitas Pelaporan" helper="Pelengkap kop lembar BTOR (opsional).">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Jabatan pelapor
              <input
                name="jabatan"
                type="text"
                defaultValue={btor?.jabatan ?? ""}
                placeholder="mis. Koordinator Lapangan"
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Nama tim tagging
              <input
                name="tim_tagging"
                type="text"
                defaultValue={btor?.timTagging ?? ""}
                placeholder="mis. Kelompok Taging Lunang"
                className={inputClass}
              />
            </label>
          </div>
          <label className="mt-3 block text-sm text-zinc-600 dark:text-zinc-300">
            Judul laporan <span className="text-zinc-400">(kosongkan untuk otomatis: “BTOR Tagging &lt;desa&gt;”)</span>
            <input
              name="judul"
              type="text"
              defaultValue={btor?.judul ?? ""}
              placeholder="mis. BTOR Tagging Desa Lunang"
              className={inputClass}
            />
          </label>
        </Step>
      </ol>

      <div className="mt-10 flex flex-col gap-5 border-t border-zinc-100 pt-6 dark:border-night-800 sm:flex-row">
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
            BTOR dapat dilengkapi dan dikirim nanti.
          </p>
        </div>
        <div className="flex-1">
          <button
            type="submit"
            name="status"
            value="terkirim"
            disabled={pending !== null}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="kirim-btor"
          >
            <Send className="mr-2 inline h-4 w-4" />
            {pending === "terkirim" ? "Mengirim…" : edit ? "Kirim Ulang BTOR" : "Kirim BTOR"}
          </button>
          <p className="mt-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
            BTOR akan diperiksa oleh admin Pohon Asuh.
          </p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
        <ClipboardCheck className="h-3.5 w-3.5" />
        Setelah diverifikasi, memo pencairan dana diterbitkan dari halaman detail BTOR.
      </p>
    </form>
  );
}
