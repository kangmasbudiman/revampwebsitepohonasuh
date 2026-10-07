import Image from "next/image";
import { apiAssetUrl } from "@/lib/api";

// Avatar profil: foto member (bila ada) via next/image, fallback lingkaran
// gradient emerald + inisial.
export default function Avatar({
  src,
  name,
  size = 36,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const url = apiAssetUrl(src);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (url) {
    return (
      <span
        style={{ width: size, height: size }}
        className={`relative inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-white/40 ${className}`}
      >
        <Image src={url} alt={name} fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.4)) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 font-bold text-white shadow-sm ring-2 ring-white/40 ${className}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
