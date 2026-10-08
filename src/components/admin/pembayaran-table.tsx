"use client";

// Tabel Pencatatan Keuangan: daftar pohon "sudah ditagging" (sinkron hidup
// dengan Order Tagging) + filter + form catat/edit pembayaran via modal.
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, Clock, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import {
  catatPembayaran,
  editPembayaran,
  deletePembayaran,
} from "@/lib/actions/pembayaran";
import type { AdminState } from "@/lib/actions/admin";
import type { ApiPembayaranRow } from "@/lib/api";
import { rupiah } from "@/lib/format";
import ConfirmSubmit from "@/components/admin/confirm-submit";

const PER_PAGE = 50;
const METODE = ["Tunai", "Transfer", "QRIS", "Lainnya"];

export default function PembayaranTable({ rows }: { rows: ApiPembayaranRow[] }) {
  const [cari, setCari] = useState("");
  const [desa, setDesa] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<null | { mode: "create" | "edit"; row: ApiPembayaranRow }>(null);

  const desaOptions = useMemo(
    () => [...new Set(rows.map((r) => r.desa))].filter(Boolean).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return rows.filter((r) => {
      if (desa && r.desa !== desa) return false;
      if (status === "belum" && r.dibayar) return false;
      if (status === "sudah" && !r.dibayar) return false;
      if (q) {
        const hay = `${r.idpohon} ${r.localname} ${r.invoice} ${r.petugasDesa} ${r.bayar?.penerima ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, cari, desa, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);
  const adaFilter = cari !== "" || desa !== "" || status !== "";

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          aria-label="Cari pohon"
          value={cari}
          onChange={(e) => {
            setCari(e.target.value);
            setPage(1);
          }}
          placeholder="Cari kode pohon, invoice, penerima…"
          className="w-64 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        />
        <select
          aria-label="Filter desa"
          value={desa}
          onChange={(e) => {
            setDesa(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        >
          <option value="">Semua desa</option>
          {desaOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status pembayaran"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
        >
          <option value="">Semua status</option>
          <option value="belum">Belum dibayar</option>
          <option value="sudah">Sudah dibayar</option>
        </select>
        {adaFilter && (
          <button
            type="button"
            aria-label="Reset filter"
            onClick={() => {
              setCari("");
              setDesa("");
              setStatus("");
              setPage(1);
            }}
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            Reset
          </button>
        )}
        <span
          data-testid="jml-pembayaran"
          className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-night-800 dark:text-emerald-300"
        >
          {filtered.length.toLocaleString("id-ID")} pohon
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="pa-thead text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Pohon</th>
              <th className="px-4 py-3">Desa</th>
              <th className="px-4 py-3">Petugas Desa</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Tagging</th>
              <th className="px-4 py-3 text-right">Nilai Adopsi</th>
              <th className="px-4 py-3">Pembayaran</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {pageRows.map((r) => (
              <tr key={r.idadopsi} data-idadopsi={r.idadopsi} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{r.idpohon}</span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-300">{r.localname}</span>
                </td>
                <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300">{r.desa}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{r.petugasDesa || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.invoice}</td>
                <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {r.jmlFoto > 0 ? `${r.jmlFoto} foto` : "Selesai"}
                  {r.tglTagging ? <span className="block text-zinc-400">{r.tglTagging}</span> : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-100">
                  {rupiah(r.price)}
                </td>
                <td className="px-4 py-3">
                  {r.dibayar && r.bayar ? (
                    <span
                      data-testid="chip-dibayar"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Dibayar {rupiah(r.bayar.jumlah)} · {r.bayar.tanggal}
                      <span className="font-normal text-emerald-600 dark:text-emerald-400">({r.bayar.metode})</span>
                    </span>
                  ) : (
                    <span
                      data-testid="chip-belum-bayar"
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    >
                      <Clock className="h-3.5 w-3.5" /> Belum dibayar
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {r.dibayar && r.bayar ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Edit pembayaran ${r.idpohon}`}
                          onClick={() => setDialog({ mode: "edit", row: r })}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <form action={deletePembayaran}>
                          <input type="hidden" name="id" value={r.bayar.id} />
                          <ConfirmSubmit
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                            message={`Hapus catatan pembayaran pohon ${r.idpohon} (${rupiah(r.bayar.jumlah)})? Pohon kembali berstatus belum dibayar.`}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </ConfirmSubmit>
                        </form>
                      </>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Catat pembayaran ${r.idpohon}`}
                        onClick={() => setDialog({ mode: "create", row: r })}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
                      >
                        <PlusCircle className="h-3.5 w-3.5" /> Catat Pembayaran
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Tidak ada pohon pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            Halaman {pageSafe} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage(pageSafe - 1)}
              className="rounded-lg border border-emerald-200 px-3 py-1.5 font-medium text-emerald-700 disabled:opacity-40 dark:border-night-700 dark:text-emerald-300"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage(pageSafe + 1)}
              className="rounded-lg border border-emerald-200 px-3 py-1.5 font-medium text-emerald-700 disabled:opacity-40 dark:border-night-700 dark:text-emerald-300"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}

      {dialog && <FormPembayaran mode={dialog.mode} row={dialog.row} onClose={() => setDialog(null)} />}
    </div>
  );
}

function FormPembayaran({
  mode,
  row,
  onClose,
}: {
  mode: "create" | "edit";
  row: ApiPembayaranRow;
  onClose: () => void;
}) {
  const edit = mode === "edit";
  const [state, action, pending] = useActionState<AdminState, FormData>(
    edit ? editPembayaran : catatPembayaran,
    {},
  );
  const router = useRouter();
  const batalRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    batalRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (state.saved) {
      const t = setTimeout(() => {
        onClose();
        router.refresh();
      }, 700);
      return () => clearTimeout(t);
    }
  }, [state.saved, onClose, router]);

  const bayar = row.bayar;

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={edit ? "Edit pembayaran" : "Catat pembayaran"}
    >
      <button
        type="button"
        aria-label="Batal"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />
      <div className="animate-menu relative mx-auto mt-[10vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl dark:border-night-700 dark:bg-night-900">
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 dark:from-night-800 dark:to-night-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
            <Banknote className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">
              {edit ? "Edit Pembayaran" : "Catat Pembayaran"}
            </h3>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {row.idpohon} · {row.localname} · <span className="capitalize">{row.desa}</span> · {row.invoice}
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-night-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="space-y-3 px-5 py-4">
          {edit && bayar ? <input type="hidden" name="id" value={bayar.id} /> : null}
          <input type="hidden" name="idadopsi" value={row.idadopsi} />

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Jumlah (Rp)
            <input
              name="jumlah"
              type="number"
              min="1"
              required
              defaultValue={bayar?.jumlah ?? row.price}
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
            />
            <span className="mt-1 block text-xs font-normal text-zinc-400">
              Terisi otomatis dari nilai adopsi — sesuaikan bila perlu.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Tanggal
              <input
                name="tanggal"
                type="date"
                required
                defaultValue={bayar?.tanggal ?? new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Metode
              <select
                name="metode"
                defaultValue={bayar?.metode ?? "Tunai"}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
              >
                {METODE.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Penerima
            <input
              name="penerima"
              defaultValue={bayar?.penerima ?? row.petugasDesa}
              maxLength={150}
              placeholder="Petugas desa"
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
            />
            <span className="mt-1 block text-xs font-normal text-zinc-400">
              Terisi otomatis dari penugasan desa — boleh diganti.
            </span>
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Catatan <span className="font-normal text-zinc-400">(opsional)</span>
            <input
              name="catatan"
              defaultValue={bayar?.catatan ?? ""}
              maxLength={255}
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
            />
          </label>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {state.error}
            </p>
          )}
          {state.saved && !state.error && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-night-800 dark:text-emerald-300">
              Pembayaran tersimpan.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-emerald-50 pt-3 dark:border-night-800">
            <button
              ref={batalRef}
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Simpan Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
