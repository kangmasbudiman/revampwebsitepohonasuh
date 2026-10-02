"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Gift, ShoppingCart } from "lucide-react";
import { addToCart, MAX_YEARS } from "@/lib/cart";
import { createAdoption, type AdoptionState } from "@/lib/actions/adoption";
import { rupiah } from "@/lib/format";

type TreeInfo = {
  code: string;
  localName: string;
  desa: string;
  priceIdr: number;
  photoUrl: string | null;
};

export default function AdoptPanel({
  tree,
  loggedIn,
}: {
  tree: TreeInfo;
  loggedIn: boolean;
}) {
  const [state, action, pending] = useActionState<AdoptionState, FormData>(
    createAdoption,
    {},
  );
  const [years, setYears] = useState(1);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [added, setAdded] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const total = tree.priceIdr * years;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const result = addToCart({
      code: tree.code,
      localName: tree.localName,
      desa: tree.desa,
      priceIdr: tree.priceIdr,
      photoUrl: tree.photoUrl,
      years,
      giftName: giftName.trim(),
      giftNote: giftNote.trim(),
    });
    if (result === "duplicate") {
      setDuplicate(true);
      window.setTimeout(() => setDuplicate(false), 2000);
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  if (!loggedIn) {
    return (
      <Link
        href={`/masuk?next=/pohon/${tree.code}`}
        className="block w-full rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Masuk untuk Mengadopsi
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="adopt-years"
          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Durasi adopsi
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: MAX_YEARS }, (_, i) => i + 1).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYears(y)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                years === y
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {y} {y === 1 ? "tahun" : "tahun"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {rupiah(tree.priceIdr)} / tahun × {years} tahun
        </p>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40">
        <button
          type="button"
          onClick={() => setGiftOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Adopsi sebagai hadiah
            {giftName.trim() && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                aktif
              </span>
            )}
          </span>
          <span className="text-xs font-normal text-emerald-700">
            {giftOpen ? "Tutup" : "Buka"}
          </span>
        </button>
        {giftOpen && (
          <div className="space-y-3 border-t border-emerald-100 px-4 py-3">
            <div>
              <label
                htmlFor="gift-name"
                className="text-xs font-medium text-zinc-500"
              >
                Nama penerima (tercetak di sertifikat)
              </label>
              <input
                id="gift-name"
                type="text"
                maxLength={100}
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                placeholder="mis. Ibu Sinta"
                className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="gift-note"
                className="text-xs font-medium text-zinc-500"
              >
                Pesan / memo di sertifikat
              </label>
              <textarea
                id="gift-note"
                maxLength={200}
                rows={2}
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="mis. Selamat hari ibu!"
                className="mt-1 w-full resize-none rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Kosongkan bila bukan hadiah — sertifikat memakai nama akun Anda.
            </p>
          </div>
        )}
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="treeCode" value={tree.code} />
        <input type="hidden" name="years" value={years} />
        <input type="hidden" name="nama" value={giftName.trim()} />
        <input type="hidden" name="pesan" value={giftNote.trim()} />
        <div className="flex items-baseline justify-between rounded-xl bg-emerald-50 px-4 py-3">
          <span className="text-sm text-zinc-600">Total</span>
          <span className="text-xl font-bold text-emerald-700">
            {rupiah(total)}
          </span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Memproses..." : "Adopsi Sekarang"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>

      <div className="w-full">
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
        >
          {added || duplicate ? (
            <Check className="h-4 w-4" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          Masukkan Keranjang
        </button>
        {(added || duplicate) && (
          <p
            className={`mt-2 text-center text-xs font-medium ${
              duplicate ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {duplicate
              ? "Pohon ini sudah ada di keranjang."
              : "Berhasil masuk keranjang ✓"}
          </p>
        )}
      </div>
    </div>
  );
}
