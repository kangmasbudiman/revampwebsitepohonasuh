"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Map as MlMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import { Map as MapIcon, Sun, Layers, Satellite, type LucideIcon } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ApiPetaPohon } from "@/lib/api";

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  AVAILABLE: { color: "#059669", label: "Tersedia" },
  RESERVED: { color: "#d97706", label: "Dipesan" },
  ADOPTED: { color: "#52525b", label: "Teradopsi" },
};

// Path pohon cemara 24×24: dipakai legenda (SVG) & marker (canvas→MapLibre icon).
const TREE_PATH = "M12 2 6 10h3l-4 6h5v4h4v-4h5l-4-6h3z";

// Gaya peta identik dengan aplikasi mobile (polyline_google_map_custom_widget.dart):
// OpenFreeMap Liberty/Bright/Positron + satelit Esri sebagai style raster inline.
const SATELIT_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri — Source: Esri",
    },
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
};

type Basemap = {
  key: string;
  label: string;
  icon: LucideIcon;
  style: string | StyleSpecification;
};

const BASEMAPS: Basemap[] = [
  { key: "standar", label: "Standar", icon: MapIcon, style: "https://tiles.openfreemap.org/styles/liberty" },
  { key: "terang", label: "Terang", icon: Sun, style: "https://tiles.openfreemap.org/styles/bright" },
  { key: "minimal", label: "Minimal", icon: Layers, style: "https://tiles.openfreemap.org/styles/positron" },
  { key: "satelit", label: "Satelit", icon: Satellite, style: SATELIT_STYLE },
];

const SOURCE_ID = "pohon";
const LAYER_ID = "pohon-points";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

// Rasterisasi ikon pohon via canvas → ImageData untuk layer symbol MapLibre.
function buatIkonPohon(color: string): ImageData {
  const px = 48; // pixelRatio 2 → tampil 24px, di-scale icon-size jadi 18px
  const kanvas = document.createElement("canvas");
  kanvas.width = px;
  kanvas.height = px;
  const ctx = kanvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.5;
  const path = new Path2D(TREE_PATH);
  ctx.strokeStyle = "white";
  ctx.stroke(path);
  ctx.fillStyle = color;
  ctx.fill(path);
  return ctx.getImageData(0, 0, px, px);
}

function keGeoJson(pohon: ApiPetaPohon[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: pohon.map((p) => ({
      type: "Feature" as const,
      id: p.id,
      properties: {
        code: p.code,
        localName: p.localName,
        status: p.status,
        icon: `pohon-${(STATUS_STYLE[p.status] ? p.status : "AVAILABLE").toLowerCase()}`,
      },
      geometry: { type: "Point" as const, coordinates: [p.lng!, p.lat!] },
    })),
  };
}

function fitKeData(map: MlMap, fc: FeatureCollection) {
  if (fc.features.length === 0) return;
  if (fc.features.length === 1) {
    const c = (fc.features[0].geometry as Point).coordinates;
    map.jumpTo({ center: [c[0], c[1]], zoom: 16 });
    return;
  }
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const f of fc.features) {
    const [lng, lat] = (f.geometry as Point).coordinates;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding: 32, maxZoom: 16, duration: 0 },
  );
}

// Peta sebaran pohon satu desa untuk halaman publik /lokasi/[slug].
// MapLibre GL + tile OpenFreeMap — gaya identik dengan aplikasi mobile.
export default function DesaMap({ desa, pohon }: { desa: string; pohon: ApiPetaPohon[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const dataRef = useRef<FeatureCollection | null>(null);
  const fitRef = useRef(true);
  const styleRef = useRef("standar");
  const router = useRouter();
  const [basemap, setBasemap] = useState("standar");

  const valid = pohon.filter((p) => p.lat !== null && p.lng !== null);

  // Data pohon berubah (mis. ganti desa) → simpan + muat ulang source.
  useEffect(() => {
    dataRef.current = keGeoJson(valid);
    fitRef.current = true;
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src && dataRef.current) src.setData(dataRef.current);
    if (map.isStyleLoaded() && dataRef.current) {
      fitRef.current = false;
      fitKeData(map, dataRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desa, valid.length]);

  // Inisialisasi peta SEKALI; layer & ikon dipasang ulang tiap style load
  // (ganti style menghapus source/layer — sama seperti di mobile).
  useEffect(() => {
    if (!containerRef.current) return;
    // Turbopack menulis-ulang import.meta.url sehingga MapLibre tak bisa
    // menemukan worker-nya → sajikan statis dari /public (worker versi ini
    // wajib disalin ulang bila maplibre-gl di-upgrade: maplibre-gl-worker.mjs
    // + maplibre-gl-shared.mjs).
    setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
    const map = new MlMap({
      container: containerRef.current,
      style: BASEMAPS[0].style,
      center: valid.length ? [valid[0].lng!, valid[0].lat!] : [101.7, -2.6],
      zoom: 13,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: false }), "top-left");

    const pasangLayer = () => {
      for (const [status, s] of Object.entries(STATUS_STYLE)) {
        const id = `pohon-${status.toLowerCase()}`;
        if (!map.hasImage(id)) map.addImage(id, buatIkonPohon(s.color), { pixelRatio: 2 });
      }
      const data = dataRef.current ?? { type: "FeatureCollection" as const, features: [] };
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "geojson", data });
        map.addLayer({
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": 0.75,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }
      if (fitRef.current && data.features.length > 0) {
        fitRef.current = false;
        fitKeData(map, data);
      }
    };
    map.on("style.load", pasangLayer);

    map.on("click", LAYER_ID, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const { code, localName, status } = f.properties as {
        code: string;
        localName: string;
        status: string;
      };
      const s = STATUS_STYLE[status] ?? STATUS_STYLE.AVAILABLE;
      const href = `/pohon/${encodeURIComponent(code)}`;
      const popup = new Popup({ offset: 14, maxWidth: "240px" })
        .setLngLat((f.geometry as Point).coordinates as [number, number])
        .setHTML(
          `<strong>${escapeHtml(code)}</strong> — ${escapeHtml(localName)}<br />` +
            `<span style="color:${s.color};font-weight:600">${s.label}</span><br />` +
            `<a href="${href}" data-pohon-link style="color:#047857;font-weight:600">Lihat detail pohon →</a>`,
        )
        .addTo(map);
      popup.on("open", () => {
        popup
          .getElement()
          ?.querySelector("a[data-pohon-link]")
          ?.addEventListener("click", (ev) => {
            ev.preventDefault();
            popup.remove();
            router.push(href);
          });
      });
    });
    map.on("mouseenter", LAYER_ID, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", LAYER_ID, () => (map.getCanvas().style.cursor = ""));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ganti gaya peta (lewati bila sama dengan style yang sudah aktif).
  useEffect(() => {
    const target = BASEMAPS.find((b) => b.key === basemap)?.style;
    const map = mapRef.current;
    if (!map || !target || styleRef.current === basemap) return;
    styleRef.current = basemap;
    map.setStyle(target);
  }, [basemap]);

  return (
    <div>
      <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-emerald-100 shadow-sm sm:h-[460px]">
        {/* `h-full w-full`, bukan `absolute inset-0`: CSS MapLibre men-set
            .maplibregl-map{position:relative} yang menimpa Tailwind `absolute`
            (dimuat belakangan) → container tingginya 0. */}
        <div ref={containerRef} className="h-full w-full" />
        <div className="absolute right-3 top-3 z-10 flex gap-0.5 rounded-full border border-emerald-100 bg-white/95 p-1 shadow-md backdrop-blur-sm">
          {BASEMAPS.map((b) => {
            const Icon = b.icon;
            const on = basemap === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBasemap(b.key)}
                title={`Peta ${b.label}`}
                aria-label={`Gaya peta ${b.label}`}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  on
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600">
        {Object.entries(STATUS_STYLE).map(([status, s]) => (
          <span key={status} className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0 drop-shadow-sm">
              <path
                d={TREE_PATH}
                fill={s.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
                paintOrder="stroke"
              />
            </svg>
            {s.label} ({valid.filter((p) => p.status === status).length})
          </span>
        ))}
      </div>
    </div>
  );
}
