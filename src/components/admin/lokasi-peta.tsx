"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MlMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import { Map as MapIcon, Sun, Layers, Satellite, type LucideIcon } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ApiLokasi, ApiPetaPohon } from "@/lib/api";
import {
  STATUS_STYLE,
  TREE_PATH,
  koordinatValid,
} from "@/components/admin/lokasi-peta-shared";

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

type Basemap = { key: string; label: string; icon: LucideIcon; style: string | StyleSpecification };

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

function buatIkonPohon(color: string): ImageData {
  const px = 48; // pixelRatio 2 → tampil 24px, di-scale icon-size jadi 15px
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
        desa: p.desa ?? "",
        status: p.status,
        icon: `pohon-${(STATUS_STYLE[p.status] ? p.status : "AVAILABLE").toLowerCase()}`,
      },
      geometry: { type: "Point" as const, coordinates: [p.lng!, p.lat!] },
    })),
  };
}

function boundsFc(fc: FeatureCollection): [[number, number], [number, number]] {
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
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

// Peta sebaran seluruh pohon (±3.900 titik) untuk /admin/lokasi — MapLibre
// layer symbol GPU; gaya peta identik aplikasi mobile dan bisa diganti-ganti.
export default function LokasiPeta({
  lokasi,
  pohon,
  focus,
}: {
  lokasi: ApiLokasi[];
  pohon: ApiPetaPohon[];
  focus: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const dataRef = useRef<FeatureCollection | null>(null);
  const fitRef = useRef(true);
  const styleRef = useRef("standar");
  const [basemap, setBasemap] = useState("standar");

  useEffect(() => {
    if (!containerRef.current) return;
    const titik = pohon.filter(koordinatValid);
    dataRef.current = keGeoJson(titik);
    // Turbopack menulis-ulang import.meta.url sehingga MapLibre tak bisa
    // menemukan worker-nya → sajikan statis dari /public (disalin ulang bila
    // maplibre-gl di-upgrade).
    setWorkerUrl(new URL("/maplibre-gl-worker.mjs", window.location.origin).href);
    const map = new MlMap({
      container: containerRef.current,
      style: BASEMAPS[0].style,
      center: [102.2, -1.6],
      zoom: 7,
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
            "icon-size": 0.62,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }
      if (fitRef.current && data.features.length > 0) {
        fitRef.current = false;
        map.fitBounds(boundsFc(data), { padding: 32, maxZoom: 14, duration: 0 });
      }
    };
    map.on("style.load", pasangLayer);

    map.on("click", LAYER_ID, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const { code, localName, desa, status } = f.properties as {
        code: string;
        localName: string;
        desa: string;
        status: string;
      };
      const s = STATUS_STYLE[status] ?? STATUS_STYLE.AVAILABLE;
      new Popup({ offset: 14, maxWidth: "240px" })
        .setLngLat((f.geometry as Point).coordinates as [number, number])
        .setHTML(
          `<strong>${escapeHtml(code)}</strong> — ${escapeHtml(localName)}<br />` +
            `${escapeHtml(desa)}<br />` +
            `<span style="color:${s.color};font-weight:600">${s.label}</span>`,
        )
        .addTo(map);
    });
    map.on("mouseenter", LAYER_ID, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", LAYER_ID, () => (map.getCanvas().style.cursor = ""));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tombol pin baris desa → rapatkan pandangan ke sebaran pohon desa itu
  // (fallback: koordinat pusat desa dari tabel).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const titik = pohon.filter((p) => p.desa === focus && koordinatValid(p));
    if (titik.length > 0) {
      const lats = titik.map((t) => t.lat!);
      const lngs = titik.map((t) => t.lng!);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 48, maxZoom: 16, duration: 800 },
      );
      return;
    }
    const d = lokasi.find((l) => l.nama === focus);
    const lat = Number(d?.lat);
    const lng = Number(d?.lng);
    if (d && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      map.flyTo({ center: [lng, lat], zoom: 13, duration: 800 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // Ganti gaya peta (lewati bila sama dengan style yang sudah aktif).
  useEffect(() => {
    const target = BASEMAPS.find((b) => b.key === basemap)?.style;
    const map = mapRef.current;
    if (!map || !target || styleRef.current === basemap) return;
    styleRef.current = basemap;
    map.setStyle(target);
  }, [basemap]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-emerald-100 shadow-sm dark:border-night-700">
      {/* `h-full w-full`, bukan `absolute inset-0`: CSS MapLibre men-set
          .maplibregl-map{position:relative} yang menimpa Tailwind `absolute`. */}
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute right-3 top-3 z-10 flex gap-0.5 rounded-full border border-emerald-100 bg-white/95 p-1 shadow-md backdrop-blur-sm dark:border-night-700 dark:bg-night-900/95">
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
                  ? "pa-btn-primary text-white shadow-sm"
                  : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-night-800 dark:hover:text-emerald-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
