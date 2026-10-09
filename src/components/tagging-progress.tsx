"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CameraOff, Check, Loader2, TreePine, X } from "lucide-react";
import type { ApiTaggingTree } from "@/lib/api";
import { namaDesa, tanggal } from "@/lib/format";
import { useI18n } from "@/components/i18n-provider";

function statusOf(d: { statusDone: string; statusOngoing: string; statusWaiting: string }, proses: number) {
  if (proses >= 3)
    return { label: d.statusDone, className: "bg-emerald-100 text-emerald-800" };
  if (proses === 2)
    return { label: d.statusOngoing, className: "bg-amber-100 text-amber-800" };
  return { label: d.statusWaiting, className: "bg-zinc-100 text-zinc-600" };
}

function stepState(i: number, proses: number): "done" | "active" | "pending" {
  if (i === 0) return "done"; // section ini hanya muncul utk order terverifikasi
  if (i === 1) return proses >= 3 ? "done" : proses === 2 ? "active" : "pending";
  return proses >= 3 ? "done" : "pending";
}

export default function TaggingProgress({ trees }: { trees: ApiTaggingTree[] }) {
  const { dict } = useI18n();
  const d = dict.dashboard.tagging;
  const STEPS = [d.step1, d.step2, d.step3];
  const [zoom, setZoom] = useState<{ tree: ApiTaggingTree; index: number } | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoom]);

  if (trees.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-emerald-950">{d.title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{d.desc}</p>

      <div className="mt-4 space-y-4">
        {trees.map((t) => {
          const st = statusOf(d, t.proses);
          return (
            <article
              key={t.idadopsi}
              data-tagging-tree={t.idpohon}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-950">
                    {t.localName || d.tree}{" "}
                    <span className="font-normal text-zinc-400">({t.idpohon})</span>
                  </p>
                  <p className="text-xs text-zinc-500">📍 {namaDesa(t.desa)}</p>
                </div>
                <span
                  data-tagging-status={t.idpohon}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${st.className}`}
                >
                  {st.label}
                </span>
              </div>

              {/* Timeline 3 langkah */}
              <ol
                className="mt-5 flex items-start"
                aria-label={d.processAria.replaceAll("{tree}", t.idpohon)}
              >
                {STEPS.map((label, i) => {
                  const state = stepState(i, t.proses);
                  return (
                    <li key={label} className="flex flex-1 flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        <span
                          className={`h-0.5 flex-1 ${
                            i === 0 ? "bg-emerald-500" : state === "done" ? "bg-emerald-500" : "bg-zinc-200"
                          }`}
                        />
                        <span
                          data-step={i}
                          data-state={state}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            state === "done"
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : state === "active"
                                ? "border-amber-500 bg-amber-50 text-amber-600"
                                : "border-zinc-200 bg-white text-zinc-300"
                          }`}
                        >
                          {state === "done" ? (
                            <Check className="h-4 w-4" aria-hidden />
                          ) : state === "active" ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <TreePine className="h-4 w-4" aria-hidden />
                          )}
                        </span>
                        <span
                          className={`h-0.5 flex-1 ${
                            i === STEPS.length - 1
                              ? "bg-transparent"
                              : stepState(i + 1, t.proses) === "done"
                                ? "bg-emerald-500"
                                : stepState(i + 1, t.proses) === "active"
                                  ? "bg-amber-400"
                                  : "bg-zinc-200"
                          }`}
                        />
                      </div>
                      <span
                        className={`mt-2 max-w-[7rem] text-[11px] leading-tight ${
                          state === "pending" ? "text-zinc-400" : "font-medium text-zinc-700"
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {/* Bukti foto tagging */}
              {t.foto.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {t.foto.map((f, i) => (
                    <button
                      key={`${t.idadopsi}-${i}`}
                      type="button"
                      data-tagging-foto={t.idpohon}
                      aria-label={d.enlargeAria.replaceAll("{tree}", t.idpohon).replaceAll("{n}", String(i + 1))}
                      onClick={() => setZoom({ tree: t, index: i })}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50"
                    >
                      <Image
                        src={f.url}
                        alt={d.photoAlt.replaceAll("{tree}", t.idpohon).replaceAll("{n}", String(i + 1))}
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="object-cover transition group-hover:scale-105"
                      />
                      {f.tanggal && (
                        <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-1 text-[10px] text-white">
                          {tanggal(f.tanggal)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4 text-sm text-zinc-500">
                  <CameraOff className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                  <span>{d.noPhotos}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Lightbox foto */}
      {zoom && (
        <div
          role="dialog"
          aria-label={d.lightboxAria}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[75vh] w-full overflow-hidden rounded-2xl bg-black">
              <Image
                src={zoom.tree.foto[zoom.index].url}
                alt={`${d.lightboxAria} ${zoom.tree.idpohon}`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-white">
              <p className="text-sm">
                {zoom.tree.localName || d.tree} ({zoom.tree.idpohon}) ·{" "}
                {d.photoOf}
                {zoom.index + 1} {d.of} {zoom.tree.foto.length}
                {zoom.tree.foto[zoom.index].tanggal &&
                  ` · ${tanggal(zoom.tree.foto[zoom.index].tanggal!)}`}
              </p>
              <button
                type="button"
                aria-label={d.closeAria}
                onClick={() => setZoom(null)}
                className="rounded-full bg-white/15 p-2 hover:bg-white/25"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
