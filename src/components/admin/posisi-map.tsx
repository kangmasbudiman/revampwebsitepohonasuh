"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ApiPosisiPetugas } from "@/lib/api";

// Titik (bukan pin) agar tak perlu aset gambar marker bawaan leaflet
// yang path-nya rusak di bundler.
function dotIcon(stale: boolean) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);background:${
      stale ? "#dc2626" : "#059669"
    }"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const STALE_MS = 6 * 60 * 60 * 1000;

export default function PosisiMap({ petugas }: { petugas: ApiPosisiPetugas[] }) {
  const valid = petugas.filter((p) => p.lat !== 0 && p.lng !== 0);
  const center: [number, number] = valid.length
    ? [valid[0].lat, valid[0].lng]
    : [-2.6, 101.7]; // fallback: sekitar Jambi (lokasi hutan utama)

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-emerald-100 dark:border-night-700">
      <MapContainer center={center} zoom={9} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid.map((p) => {
          const stale = p.updatedAt
            ? Date.now() - new Date(p.updatedAt).getTime() > STALE_MS
            : false;
          return (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={dotIcon(stale)}>
              <Popup>
                <span className="font-semibold">{p.nama}</span>
                <br />
                {p.updatedAt ? new Date(p.updatedAt).toLocaleString("id-ID") : "—"}
                {stale && <span style={{ color: "#dc2626" }}> · belum update &gt; 6 jam</span>}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
