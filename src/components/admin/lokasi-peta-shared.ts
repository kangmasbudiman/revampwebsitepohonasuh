// Konstanta bersama peta lokasi (tanpa import maplibre) supaya legenda di
// lokasi-table tidak ikut membundel peta ke chunk-nya.
export const TREE_PATH = "M12 2 6 10h3l-4 6h5v4h4v-4h5l-4-6h3z";

export const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  AVAILABLE: { color: "#059669", label: "Tersedia" },
  RESERVED: { color: "#d97706", label: "Dipesan" },
  ADOPTED: { color: "#52525b", label: "Teradopsi" },
};

// Ada data luar seperti SRD242 (longitude 999.999999) — tanpa saringan ini
// fitBounds awal melebar sampai world view.
export function koordinatValid(p: {
  lat: number | null;
  lng: number | null;
}): boolean {
  return (
    p.lat !== null &&
    p.lng !== null &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}
