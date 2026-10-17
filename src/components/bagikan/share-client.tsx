"use client";

// Kontrol pemilik di halaman /bagikan: pilih template desa + pilih pohon
// (multi-pohon) → param URL; memo via form sertifikat yang sama; unduh
// PNG 1080×1920 (render offscreen + html-to-image) dan bagikan (Web Share
// API file; fallback salin tautan / WhatsApp).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Download, ImageUp, Link2, Loader2, Share2, TreePine } from "lucide-react";
import { renderNodeToPng } from "@/lib/capture-png";
import type { ApiTemplateShare } from "@/lib/api";
import { useI18n } from "@/components/i18n-provider";
import SertifikatMemoForm from "@/components/sertifikat-memo-form";
import ShareDesign, { type ShareDesignData } from "@/components/bagikan/share-design";

export default function ShareClient({
  certPath,
  templates,
  terpilihId,
  pohonList,
  pohonParam,
  memo,
  design,
}: {
  certPath: string; // certnum ter-encode untuk URL
  templates: ApiTemplateShare[];
  terpilihId: number | null;
  pohonList: { idpohon: string; localname: string }[];
  pohonParam: string | null;
  memo: string;
  design: ShareDesignData;
}) {
  const { dict } = useI18n();
  const t = dict.bagikan;
  const router = useRouter();
  const [tersalin, setTersalin] = useState(false);
  const [png, setPng] = useState<Blob | null>(null);
  const [proses, setProses] = useState(false);
  const [gagal, setGagal] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Pre-generate PNG di latar (bukan saat klik) supaya navigator.share
  // masih dalam aktivasi user di mobile.
  useEffect(() => {
    let batal = false;
    setPng(null);
    setGagal(false);
    (async () => {
      try {
        await document.fonts.ready;
        // Dua frame + jeda kecil: pastikan React selesai render sebelum clone.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 50));
        const node = boxRef.current;
        if (!node || batal) return;
        const img = node.querySelector("img");
        if (img && !img.complete) {
          await new Promise((r) => {
            img.addEventListener("load", r, { once: true });
            img.addEventListener("error", r, { once: true });
          });
        }
        const blob = await renderNodeToPng(node, 1080, 1920);
        if (!batal) setPng(blob);
      } catch {
        if (!batal) setGagal(true);
      }
    })();
    return () => {
      batal = true;
    };
  }, [design]);

  const url = (params: { tpl?: number | null; pohon?: string | null }) => {
    const q = new URLSearchParams();
    const tpl = params.tpl !== undefined ? params.tpl : terpilihId;
    const pohon = params.pohon !== undefined ? params.pohon : pohonParam;
    if (pohon) q.set("pohon", pohon);
    if (tpl) q.set("tpl", String(tpl));
    const qs = q.toString();
    return `/bagikan/${certPath}${qs ? `?${qs}` : ""}`;
  };

  const namaFile = `bagikan-aksi-${design.idpohon || "pohon"}.png`;

  const unduh = () => {
    if (!png) return;
    const objUrl = URL.createObjectURL(png);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = namaFile;
    a.click();
    URL.revokeObjectURL(objUrl);
  };

  const bagikan = async () => {
    if (!png) return;
    const file = new File([png], namaFile, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        setProses(true);
        await navigator.share({ files: [file], title: t.title, text: t.shareText });
        return;
      } catch {
        // dibatalkan user / gagal — fallback tombol di bawah
      } finally {
        setProses(false);
      }
    }
    salin();
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // clipboard ditolak browser
    }
  };

  const bagikanWa = () => {
    const pesan = `${t.title} — ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, "_blank", "noopener");
  };

  return (
    <>
      {/* Media render tersembunyi ukuran px persis — root statis di dalam
          wrapper fixed (pola papan-batch-bar). */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 z-[-1]"
        style={{ left: "-10000px" }}
      >
        <div ref={boxRef}>
          <ShareDesign data={design} capture />
        </div>
      </div>

      {pohonList.length > 1 && (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <TreePine className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-emerald-950">{t.pohonTitle}</h2>
              <p className="text-xs text-zinc-500">{t.pohonDesc}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" data-testid="chip-pohon">
            {pohonList.map((p) => {
              const aktif = (pohonParam ?? pohonList[0]?.idpohon) === p.idpohon;
              return (
                <button
                  key={p.idpohon}
                  type="button"
                  onClick={() => router.push(url({ pohon: p.idpohon }))}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    aktif
                      ? "bg-emerald-600 text-white"
                      : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {p.localname || p.idpohon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ImageUp className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-emerald-950">{t.templateTitle}</h2>
            <p className="text-xs text-zinc-500">{t.templateDesc}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3" data-testid="tile-template">
          {templates.map((tpl) => (
            <button key={tpl.id} type="button" onClick={() => router.push(url({ tpl: tpl.id }))} className="group text-left">
              <div
                className={`relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg ring-offset-2 transition-all ${
                  terpilihId === tpl.id
                    ? "ring-2 ring-emerald-500 ring-offset-emerald-50"
                    : "ring-1 ring-zinc-200 hover:ring-emerald-300"
                }`}
              >
                {tpl.imageUrl ? (
                  <Image src={tpl.imageUrl} alt={tpl.nama} fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-zinc-100 text-lg">🖼️</span>
                )}
                {tpl.utama && (
                  <span className="absolute top-1 left-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {t.templateUtamaBadge}
                  </span>
                )}
              </div>
              <p className="mt-1 w-20 truncate text-center text-[11px] font-medium text-zinc-600" title={tpl.nama}>
                {tpl.nama}
              </p>
            </button>
          ))}
          {templates.length === 0 && <p className="text-xs text-zinc-400">{t.templateEmpty}</p>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={unduh}
            disabled={!png}
            data-testid="unduh-share"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {png ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            {t.unduh}
          </button>
          <button
            type="button"
            onClick={bagikan}
            disabled={!png || proses}
            data-testid="bagikan-share"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            {proses ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {t.bagikan}
          </button>
          <button
            type="button"
            onClick={salin}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <Link2 className="h-4 w-4" />
            {tersalin ? t.tautanTersalin : t.salinTautan}
          </button>
          <button
            type="button"
            onClick={bagikanWa}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <Share2 className="h-4 w-4" />
            {t.bagikanWa}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          {gagal ? t.unduhGagal : t.templateHint}
        </p>
      </div>

      <SertifikatMemoForm certnum={design.certnum} memo={memo} />
    </>
  );
}
