"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, ChevronRight, Download, QrCode, Search, Tag, X } from "lucide-react";
import { certUrl, type ApiAdopsi } from "@/lib/api";
import { hapusAdopsi } from "@/lib/actions/adopsi";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import AdopsiCharts from "@/components/admin/adopsi-charts";

const PER_PAGE = 50;
const QR_LIMIT = 200;

const rupiah = new Intl.NumberFormat("id-ID");

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /["',\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function AdopsiTable({
  rows,
  initialQuery = "",
}: {
  rows: ApiAdopsi[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [desa, setDesa] = useState("semua");
  const [page, setPage] = useState(1);
  const [showQr, setShowQr] = useState(false);
  const [qrBase, setQrBase] = useState("");

  useEffect(() => {
    setQrBase(window.location.origin);
  }, []);

  const desaList = useMemo(
    () => [...new Set(rows.map((r) => r.desa).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (desa !== "semua" && r.desa !== desa) return false;
      if (!needle) return true;
      return (
        r.nama.toLowerCase().includes(needle) ||
        r.donatur.toLowerCase().includes(needle) ||
        r.idpohon.toLowerCase().includes(needle) ||
        r.certnum.toLowerCase().includes(needle) ||
        r.invoice.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, desa]);

  const totalUsd = filtered.reduce((s, r) => s + (r.cur === "USD" ? r.price ?? 0 : 0), 0);
  const totalIdr = filtered.reduce((s, r) => s + (r.cur !== "USD" ? r.price ?? 0 : 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const qrTrees = useMemo(() => {
    const seen = new Set<string>();
    const trees: { idpohon: string; nama: string }[] = [];
    for (const r of filtered) {
      if (!r.idpohon || seen.has(r.idpohon)) continue;
      seen.add(r.idpohon);
      trees.push({ idpohon: r.idpohon, nama: r.nama });
      if (trees.length >= QR_LIMIT) break;
    }
    return trees;
  }, [filtered]);

  const exportCsv = () => {
    const header = [
      "No",
      "Lokasi",
      "ID Pohon",
      "Diameter (cm)",
      "Nama Lokal",
      "Nama Penerima",
      "Donatur",
      "Tagging",
      "Certnum",
      "Tahun",
      "Donasi",
      "Metode",
      "Tgl_Adopt",
      "Tgl_Exp",
      "Invoice",
    ];
    const lines = filtered.map((r, i) =>
      [
        i + 1,
        r.desa,
        r.idpohon,
        r.diameterCm ?? "",
        r.localName,
        r.nama,
        r.donatur,
        r.tagged ? "Sudah" : "Belum",
        r.certnum,
        r.dur ?? "",
        r.price === null ? "" : r.cur === "USD" ? `US$ ${r.price}` : `Rp${r.price}`,
        r.methode,
        r.tglAdopt ?? "",
        r.tglExp ?? "",
        r.invoice,
      ]
        .map(csvCell)
        .join(","),
    );
    const today = todayCompact();
    const nama =
      desa === "semua" ? "semua" : desa.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-adopsi-${nama}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printQr = () => {
    document.body.classList.add("pa-printing");
    const cleanup = () => document.body.classList.remove("pa-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  };

  return (
    <>
      <AdopsiCharts rows={rows} lokasi={desa} />
      <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-100 pa-card shadow-sm dark:border-night-700">
      <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-4 py-3 dark:border-night-700">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama / ID pohon / certnum / invoice…"
            className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40"
          />
        </div>
        <select
          value={desa}
          onChange={(e) => {
            setDesa(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
          aria-label="Filter lokasi"
        >
          <option value="semua">Semua lokasi</option>
          {desaList.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length.toLocaleString("id-ID")} data
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
          >
            <QrCode className="h-4 w-4" /> QR Code
          </button>
          <button
            type="button"
            onClick={exportCsv}
            data-testid="export-csv"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="pa-thead border-b border-emerald-100 text-xs uppercase tracking-wide dark:border-night-700">
            <tr>
              <th className="px-3 py-3">No</th>
              <th className="px-3 py-3">ID Pohon</th>
              <th className="px-3 py-3">D</th>
              <th className="px-3 py-3">Nama Lokal</th>
              <th className="px-3 py-3">Diadopsi Oleh</th>
              <th className="px-3 py-3">Tagging</th>
              <th className="px-3 py-3">Certnum</th>
              <th className="px-3 py-3">Thn</th>
              <th className="px-3 py-3">Donasi</th>
              <th className="px-3 py-3">Metode</th>
              <th className="px-3 py-3">Tgl Adopt</th>
              <th className="px-3 py-3">Tgl Exp</th>
              <th className="px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 dark:divide-night-800">
            {pageRows.map((r, i) => (
              <tr key={r.id} className="hover:bg-emerald-50/50 dark:hover:bg-night-800/40">
                <td className="px-3 py-3 text-xs text-zinc-400">
                  {(current - 1) * PER_PAGE + i + 1}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-100">{r.idpohon}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.desa}</p>
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                  {r.diameterCm !== null ? `${r.diameterCm} cm` : "—"}
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{r.localName || "—"}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{r.nama || "—"}</p>
                  {r.donatur && r.donatur !== r.nama && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.donatur}</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Tag
                    className={`h-4 w-4 ${
                      r.tagged
                        ? "fill-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-300 dark:text-night-600"
                    }`}
                    aria-label={r.tagged ? "Sudah tagging" : "Belum tagging"}
                  />
                </td>
                <td className="px-3 py-3">
                  {r.certnum ? (
                    <Link
                      href={certUrl(r.certnum)}
                      target="_blank"
                      className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      {r.certnum}
                    </Link>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{r.dur ?? "—"}</td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">
                  {r.price === null
                    ? "—"
                    : r.cur === "USD"
                      ? `US$ ${r.price.toLocaleString("id-ID")}`
                      : `Rp${rupiah.format(r.price)}`}
                </td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{r.methode || "—"}</td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{r.tglAdopt ?? "—"}</td>
                <td className="px-3 py-3 text-zinc-600 dark:text-zinc-300">{r.tglExp ?? "—"}</td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/admin/adopsi/${r.id}/edit`}
                    className="mr-2 inline-block rounded-xl border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    Edit
                  </Link>
                  <form action={hapusAdopsi} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmit
                      message={`Hapus data adopsi ${r.idpohon} (${r.nama || "tanpa nama"})? Pohon tanpa adopsi tersisa akan dikembalikan ke tersedia.`}
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Hapus
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Tidak ada data adopsi yang cocok.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-emerald-200 bg-emerald-50/70 dark:border-night-700 dark:bg-night-800/60">
            <tr>
              <td
                colSpan={8}
                className="px-3 py-3 text-right text-xs font-semibold tracking-wide uppercase text-emerald-800 dark:text-emerald-300"
              >
                Total ({filtered.length.toLocaleString("id-ID")} data)
              </td>
              <td
                className="px-3 py-3 font-bold whitespace-nowrap text-emerald-900 dark:text-emerald-200"
                data-testid="total-donasi"
              >
                {totalUsd > 0 && (
                  <span className="block text-xs">US$ {totalUsd.toLocaleString("id-ID")}</span>
                )}
                <span className="block">Rp{rupiah.format(totalIdr)}</span>
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-emerald-100 px-4 py-3 text-sm dark:border-night-700">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Hal {current} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-700 dark:text-emerald-300 dark:hover:bg-night-800"
            >
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {showQr &&
        createPortal(
          <div className="pa-qr-overlay fixed inset-0 z-[70] overflow-auto bg-white p-6 text-zinc-900">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-4">
                <h2 className="text-lg font-bold">QR Label Pohon</h2>
                <span className="text-xs text-zinc-500">
                  {qrTrees.length} pohon dari {filtered.length} data (maks {QR_LIMIT})
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    value={qrBase}
                    onChange={(e) => setQrBase(e.target.value)}
                    aria-label="Base URL QR"
                    className="w-64 rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={printQr}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Cetak
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQr(false)}
                    aria-label="Tutup panel QR"
                    className="rounded-xl border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 print:grid-cols-3">
                {qrTrees.map((t) => (
                  <div
                    key={t.idpohon}
                    className="flex flex-col items-center rounded-xl border border-zinc-200 p-3 text-center"
                  >
                    <QRCodeSVG
                      value={`${qrBase.replace(/\/+$/, "")}/pohon/${encodeURIComponent(t.idpohon)}`}
                      size={120}
                      level="M"
                    />
                    <p className="mt-2 text-sm font-bold">{t.idpohon}</p>
                    <p className="text-[11px] leading-tight text-zinc-500">{t.nama}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </>
  );
}

function todayCompact() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
