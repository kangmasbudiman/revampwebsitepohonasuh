"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, Search } from "lucide-react";
import { reserveTree } from "@/lib/actions/tree";
import SubmitButton from "@/components/admin/submit-button";

// Tombol "Pesan Pohon" di menu Data Pohon: admin memilih akun pemesan (member
// yang ditunjuk), lalu pohon berstatus "Dipesan Admin" dan langsung dibuatkan
// invoice atas nama akun tersebut — agar akun itu bisa upload bukti bayar.
// Mendukung banyak pohon sekaligus (codes lebih dari satu) → satu invoice.
export default function ReserveTreeButton(props: React.ComponentProps<typeof ReserveTreeInner>) {
  const searchParams = useSearchParams();
  return <ReserveTreeInner key={searchParams.toString()} {...props} />;
}

function ReserveTreeInner({
  codes,
  members = [],
  localName,
  label = "Pesan Pohon",
  title = "Pesan pohon ini untuk akun pemesan tertentu",
  className = "inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-night-800",
}: {
  codes: string[];
  /** Daftar akun member (dari server) untuk dipilih sebagai pemesan. */
  members?: { id: number; name: string; emaile: string }[];
  localName?: string;
  label?: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: number; name: string; emaile: string } | null>(null);
  const banyak = codes.length > 1;
  const pratinjau = banyak
    ? `${codes.slice(0, 5).join(", ")}${codes.length > 5 ? ` +${codes.length - 5} lainnya` : ""}`
    : "";

  // Filter member berdasarkan query — tampil maks 30 agar tidak berat.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 30);
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.emaile ?? "").toLowerCase().includes(q) ||
          String(m.id).includes(q),
      )
      .slice(0, 30);
  }, [members, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setQuery(""); setSelected(null); setOpen(true); }}
        title={title}
        className={className}
      >
        <Bookmark aria-hidden className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pesan-pohon-${codes[0]}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`pesan-pohon-${codes[0]}`}
              className="text-lg font-bold text-emerald-950 dark:text-zinc-100"
            >
              {banyak ? `Pesan ${codes.length} Pohon` : `Pesan Pohon ${codes[0]}`}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {banyak ? (
                <>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:bg-night-800 dark:text-zinc-200">
                    {pratinjau}
                  </span>{" "}
                  akan dipesan untuk <strong>akun pemesan</strong> yang Anda pilih —
                  pesanan langsung dibuatkan <strong>invoice</strong> atas nama akun
                  tersebut (muncul di Verifikasi Pembayaran), dan akun itu dapat
                  upload bukti bayar dari dashboard/app. Pohon berstatus{" "}
                  <strong>Dipesan Admin</strong> sampai pesanan dibatalkan.
                </>
              ) : (
                <>
                  {localName} — pesanan langsung dibuatkan <strong>invoice</strong>{" "}
                  atas nama akun pemesan yang Anda pilih; akun itu dapat upload bukti
                  bayar dari dashboard/app. Pohon berstatus{" "}
                  <strong>Dipesan Admin</strong> sampai pesanan dibatalkan.
                </>
              )}
            </p>

            <form action={reserveTree} className="mt-4">
              {codes.map((c) => (
                <input key={c} type="hidden" name="idpohon" value={c} />
              ))}
              <input type="hidden" name="idmember" value={selected?.id ?? ""} />
              <input type="hidden" name="nama" value={selected?.name ?? ""} />
              <input type="hidden" name="email" value={selected?.emaile ?? ""} />

              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Akun pemesan
              </label>
              {selected ? (
                <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                  <span className="min-w-0">
                    <span className="block font-semibold text-emerald-900 dark:text-emerald-100">
                      {selected.name}
                    </span>
                    <span className="block truncate text-xs text-emerald-700 dark:text-emerald-300">
                      {selected.emaile || `ID ${selected.id}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="shrink-0 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:text-emerald-300"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari nama / email / ID akun…"
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 dark:border-night-700">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Tidak ada akun yang cocok.
                      </p>
                    ) : (
                      filtered.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelected(m)}
                          className="flex w-full flex-col items-start gap-0.5 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-emerald-50 dark:border-night-800 dark:hover:bg-night-800"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-100">
                            {m.name || "(tanpa nama)"}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {m.emaile || `ID ${m.id}`}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Menampilkan {filtered.length} dari {members.length} akun.
                  </p>
                </>
              )}

              <div className="mt-3">
                <label
                  htmlFor={`dur-pemesan-${codes[0]}`}
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Durasi adopsi
                </label>
                <select
                  id={`dur-pemesan-${codes[0]}`}
                  name="dur"
                  defaultValue="1"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-night-700 dark:bg-night-950 dark:text-zinc-100"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} tahun
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-night-700 dark:text-zinc-300 dark:hover:bg-night-800"
                >
                  Batal
                </button>
                <SubmitButton
                  pendingLabel="Memproses…"
                  disabled={!selected}
                  className="pa-btn-primary rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Konfirmasi Pesanan
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}