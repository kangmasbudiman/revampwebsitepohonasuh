"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { ambilFotoTaggingPohon } from "@/lib/actions/laporan";
import LaporanFotoPopup from "@/components/admin/laporan-foto-popup";

// Tombol jumlah foto tagging pada baris pohon di detail laporan — klik
// memuat galeri foto hasil tagging pohon tersebut (lihatfototaging).
export default function PohonFotoTaggingButton({
  idpohon,
  jml,
  label,
}: {
  idpohon: string;
  jml: number;
  label: string;
}) {
  const [foto, setFoto] = useState<{ id: number; url: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buka = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    const r = await ambilFotoTaggingPohon(idpohon);
    setLoading(false);
    if (!r.ok) {
      setError(r.error ?? "Gagal memuat foto.");
      return;
    }
    if (!r.foto || r.foto.length === 0) {
      setError("Belum ada foto tagging tersimpan.");
      return;
    }
    setFoto(r.foto);
  };

  return (
    <>
      <button
        type="button"
        onClick={buka}
        disabled={loading}
        title={`Lihat ${jml} foto hasil tagging pohon ${idpohon}`}
        data-testid="lihat-foto-tagging"
        className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-60 dark:text-emerald-400"
      >
        <Camera className="h-3.5 w-3.5" />
        {loading ? "Memuat…" : jml}
      </button>
      {error && <span className="ml-1 text-xs text-zinc-400">{error}</span>}
      {foto && (
        <LaporanFotoPopup
          judul={`Hasil tagging · ${label}`}
          fotos={foto}
          entity="pohon"
          onClose={() => setFoto(null)}
        />
      )}
    </>
  );
}
