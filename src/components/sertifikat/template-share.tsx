"use client";

// Pemilih template background saat share sertifikat (hanya pemilik yang
// login). Klik thumbnail → navigasi ?tpl=<id> → server re-render lembar
// dengan background tersebut; tautan yang dibagikan memuat parameter itu.
// Pilihan TIDAK disimpan — lembar default tetap template utama/bg bawaan.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Link2, Share2 } from "lucide-react";
import type { ApiTemplateSertifikat } from "@/lib/api";
import { useI18n } from "@/components/i18n-provider";

export default function TemplateShare({
  templates,
  certnum,
  terpilihId,
}: {
  templates: ApiTemplateSertifikat[];
  certnum: string;
  terpilihId: number | null;
}) {
  const { dict } = useI18n();
  const t = dict.sertifikat;
  const router = useRouter();
  const [tersalin, setTersalin] = useState(false);

  const adaUtama = templates.some((tpl) => tpl.utama);
  const certPath = certnum.split("/").map(encodeURIComponent).join("/");

  const pilih = (id: number | null) => {
    router.push(id ? `/sertifikat/${certPath}?tpl=${id}` : `/sertifikat/${certPath}`);
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // clipboard ditolak browser — biarkan tombol tanpa umpan balik
    }
  };

  const bagikanWa = () => {
    const pesan = `${t.title} — ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, "_blank", "noopener");
  };

  const tileCls = (terpilih: boolean) =>
    `relative aspect-[828/585.6] w-24 shrink-0 overflow-hidden rounded-lg ring-offset-2 transition-all ${
      terpilih
        ? "ring-2 ring-emerald-500 ring-offset-emerald-50"
        : "ring-1 ring-zinc-200 hover:ring-emerald-300"
    }`;

  return (
    <div className="no-print mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Share2 className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-emerald-950">{t.templateTitle}</h2>
          <p className="text-xs text-zinc-500">{t.templateDesc}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => pilih(null)} className="group text-left">
          <div className={tileCls(terpilihId === null)}>
            <Image
              src="/images/sertifikat/bg.png"
              alt={t.templateDefault}
              fill
              sizes="96px"
              className="object-cover"
            />
            {!adaUtama && (
              <span className="absolute top-1 left-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {t.templateUtamaBadge}
              </span>
            )}
          </div>
          <p className="mt-1 w-24 truncate text-center text-[11px] font-medium text-zinc-600">
            {t.templateDefault}
          </p>
        </button>
        {templates.map((tpl) => (
          <button key={tpl.id} type="button" onClick={() => pilih(tpl.id)} className="group text-left">
            <div className={tileCls(terpilihId === tpl.id)}>
              {tpl.imageUrl ? (
                <Image
                  src={tpl.imageUrl}
                  alt={tpl.nama}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-zinc-100 text-lg">🖼️</span>
              )}
              {tpl.utama && (
                <span className="absolute top-1 left-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {t.templateUtamaBadge}
                </span>
              )}
            </div>
            <p className="mt-1 w-24 truncate text-center text-[11px] font-medium text-zinc-600" title={tpl.nama}>
              {tpl.nama}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={salin}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          <Link2 className="h-4 w-4" />
          {tersalin ? t.linkCopied : t.copyLink}
        </button>
        <button
          type="button"
          onClick={bagikanWa}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Share2 className="h-4 w-4" />
          {t.shareWa}
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-400">{t.templateHint}</p>
    </div>
  );
}
